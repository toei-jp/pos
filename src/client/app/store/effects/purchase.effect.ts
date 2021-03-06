import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { factory } from '@cinerino/api-javascript-client';
import { Actions, Effect, ofType } from '@ngrx/effects';
import * as moment from 'moment';
import { map, mergeMap } from 'rxjs/operators';
import { format } from 'util';
import { environment } from '../../../environments/environment';
import {
    createGmoTokenObject,
    createMovieTicketsFromAuthorizeSeatReservation,
    createOrderId,
    formatTelephone
} from '../../functions';
import { getPurchaseCompleteTemplate } from '../../mails';
import { IScreen } from '../../models';
import { LibphonenumberFormatPipe } from '../../pipes/libphonenumber-format.pipe';
import { CinerinoService, StarPrintService, UtilService } from '../../services';
import * as purchase from '../actions/purchase.action';

/**
 * Purchase Effects
 */
@Injectable()
export class PurchaseEffects {

    constructor(
        private actions: Actions,
        private cinerino: CinerinoService,
        private starPrint: StarPrintService,
        private util: UtilService,
        private http: HttpClient
    ) { }

    /**
     * GetTheaters
     */
    @Effect()
    public getTheaters = this.actions.pipe(
        ofType<purchase.GetTheaters>(purchase.ActionTypes.GetTheaters),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const searchResult = await this.cinerino.seller.search(payload.params);
                const sellers = searchResult.data;
                return new purchase.GetTheatersSuccess({ sellers });
            } catch (error) {
                return new purchase.GetTheatersFail({ error: error });
            }
        })
    );

    /**
     * GetSchedule
     */
    @Effect()
    public getSchedule = this.actions.pipe(
        ofType<purchase.GetSchedule>(purchase.ActionTypes.GetSchedule),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                if (payload.seller.location === undefined
                    || payload.seller.location.branchCode === undefined) {
                    throw new Error('seller notfound');
                }
                const branchCode = payload.seller.location.branchCode;
                const scheduleDate = payload.scheduleDate;
                const screeningEventsResult = await this.cinerino.event.searchScreeningEvents({
                    typeOf: factory.chevre.eventType.ScreeningEvent,
                    eventStatuses: [factory.chevre.eventStatusType.EventScheduled],
                    superEvent: { locationBranchCodes: [branchCode] },
                    startFrom: moment(scheduleDate).toDate(),
                    startThrough: moment(scheduleDate).add(1, 'day').toDate()
                });
                const screeningEvents = screeningEventsResult.data;

                return new purchase.GetScheduleSuccess({ screeningEvents, scheduleDate });
            } catch (error) {
                return new purchase.GetScheduleFail({ error: error });
            }
        })
    );

    /**
     * StartTransaction
     */
    @Effect()
    public startTransaction = this.actions.pipe(
        ofType<purchase.StartTransaction>(purchase.ActionTypes.StartTransaction),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                const params = payload.params;
                const selleId = params.seller.id;
                await this.cinerino.getServices();
                const passport = await this.cinerino.getPassport(selleId);
                params.object = { passport };
                const transaction = await this.cinerino.transaction.placeOrder.start(params);
                return new purchase.StartTransactionSuccess({ transaction });
            } catch (error) {
                return new purchase.StartTransactionFail({ error: error });
            }
        })
    );

    /**
     * getScreen
     */
    @Effect()
    public getScreen = this.actions.pipe(
        ofType<purchase.GetScreen>(purchase.ActionTypes.GetScreen),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const screeningEventOffers = await this.cinerino.event.searchScreeningEventOffers({
                    eventId: payload.screeningEvent.id
                });
                const theaterCode = payload.screeningEvent.superEvent.location.branchCode;
                const screenCode = `000${payload.screeningEvent.location.branchCode}`.slice(-3);
                const screen = await this.http.get<IScreen>(`/json/theater/${theaterCode}/${screenCode}.json`).toPromise();
                const setting = await this.http.get<IScreen>('/json/theater/setting.json').toPromise();
                const screenData = Object.assign(setting, screen);
                return new purchase.GetScreenSuccess({ screeningEventOffers, screenData });
            } catch (error) {
                return new purchase.GetScreenFail({ error: error });
            }
        })
    );

    /**
     * temporaryReservation
     */
    @Effect()
    public temporaryReservation = this.actions.pipe(
        ofType<purchase.TemporaryReservation>(purchase.ActionTypes.TemporaryReservation),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const transaction = payload.transaction;
                const screeningEvent = payload.screeningEvent;
                const reservations = payload.reservations;
                if (payload.authorizeSeatReservation !== undefined) {
                    await this.cinerino.transaction.placeOrder.voidSeatReservation(payload.authorizeSeatReservation);
                }
                const authorizeSeatReservation = await this.cinerino.transaction.placeOrder.authorizeSeatReservation({
                    object: {
                        event: {
                            id: screeningEvent.id
                        },
                        acceptedOffer: reservations.map((reservation) => {
                            if (reservation.ticket === undefined) {
                                throw { error: 'チケットが未選択です。' };
                            }
                            return {
                                id: reservation.ticket.ticketOffer.id,
                                ticketedSeat: <any>{
                                    seatNumber: reservation.seat.seatNumber,
                                    seatSection: reservation.seat.seatSection
                                },
                                additionalProperty: []
                            };
                        })
                    },
                    purpose: transaction
                });
                return new purchase.TemporaryReservationSuccess({ authorizeSeatReservation });
            } catch (error) {
                return new purchase.TemporaryReservationFail({ error: error });
            }
        })
    );

    /**
     * temporaryReservationCancel
     */
    @Effect()
    public temporaryReservationCancel = this.actions.pipe(
        ofType<purchase.TemporaryReservationCancel>(purchase.ActionTypes.TemporaryReservationCancel),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const authorizeSeatReservation = payload.authorizeSeatReservation;
                await this.cinerino.transaction.placeOrder.voidSeatReservation(authorizeSeatReservation);
                return new purchase.TemporaryReservationCancelSuccess();
            } catch (error) {
                return new purchase.TemporaryReservationCancelFail({ error: error });
            }
        })
    );

    /**
     * getTicketList
     */
    @Effect()
    public getTicketList = this.actions.pipe(
        ofType<purchase.GetTicketList>(purchase.ActionTypes.GetTicketList),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const screeningEvent = payload.screeningEvent;
                const seller = payload.seller;
                const screeningEventTicketOffers = await this.cinerino.event.searchScreeningEventTicketOffers({
                    event: { id: screeningEvent.id },
                    seller: { typeOf: seller.typeOf, id: seller.id },
                    store: { id: this.cinerino.auth.options.clientId }
                });

                return new purchase.GetTicketListSuccess({ screeningEventTicketOffers });
            } catch (error) {
                return new purchase.GetTicketListFail({ error: error });
            }
        })
    );

    /**
     * registerContact
     */
    @Effect()
    public registerContact = this.actions.pipe(
        ofType<purchase.RegisterContact>(purchase.ActionTypes.RegisterContact),
        map(action => action.payload),
        mergeMap(async (payload) => {
            const transaction = payload.transaction;
            const contact = payload.contact;
            try {
                if (contact.telephone === undefined) {
                    throw { error: 'telephone is undefined' };
                }
                contact.telephone = formatTelephone(contact.telephone);
                await this.cinerino.getServices();
                const customerContact =
                    await this.cinerino.transaction.placeOrder.setCustomerContact({
                        id: transaction.id,
                        object: {
                            customerContact: contact
                        }
                    });

                return new purchase.RegisterContactSuccess({ customerContact });
            } catch (error) {
                return new purchase.RegisterContactFail({ error: error });
            }
        })
    );

    /**
     * authorizeCreditCard
     */
    @Effect()
    public authorizeCreditCard = this.actions.pipe(
        ofType<purchase.AuthorizeCreditCard>(purchase.ActionTypes.AuthorizeCreditCard),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                if (payload.authorizeCreditCardPayment !== undefined) {
                    await this.cinerino.transaction.placeOrder.voidPayment(payload.authorizeCreditCardPayment);
                }
                const transaction = payload.transaction;
                const orderId = createOrderId({
                    orderCount: payload.orderCount,
                    transaction: transaction
                });
                const gmoTokenObject = await createGmoTokenObject({
                    creditCard: payload.creditCard,
                    seller: payload.seller
                });
                const creditCard = { token: gmoTokenObject.token };
                const authorizeCreditCardPayment =
                    await this.cinerino.transaction.placeOrder.authorizeCreditCardPayment({
                        object: {
                            typeOf: factory.paymentMethodType.CreditCard,
                            orderId,
                            amount: payload.amount,
                            method: <any>'1',
                            creditCard
                        },
                        purpose: transaction
                    });

                return new purchase.AuthorizeCreditCardSuccess({ authorizeCreditCardPayment, gmoTokenObject });
            } catch (error) {
                return new purchase.AuthorizeCreditCardFail({ error: error });
            }
        })
    );

    /**
     * authorizeMovieTicket
     */
    @Effect()
    public authorizeMovieTicket = this.actions.pipe(
        ofType<purchase.AuthorizeMovieTicket>(purchase.ActionTypes.AuthorizeMovieTicket),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                if (payload.authorizeMovieTicketPayments.length > 0) {
                    for (const authorizeMovieTicketPayment of payload.authorizeMovieTicketPayments) {
                        await this.cinerino.transaction.placeOrder.voidPayment(authorizeMovieTicketPayment);
                    }
                }
                const transaction = payload.transaction;
                const reservations = payload.reservations;
                const authorizeSeatReservation = payload.authorizeSeatReservation;
                const authorizeMovieTicketPayments: factory.action.authorize.paymentMethod.movieTicket.IAction[] = [];
                const movieTickets = createMovieTicketsFromAuthorizeSeatReservation({
                    authorizeSeatReservation, reservations
                });
                const movieTicketIdentifiers: {
                    identifier: string;
                    movieTickets: factory.paymentMethod.paymentCard.movieTicket.IMovieTicket[]
                }[] = [];
                movieTickets.forEach((movieTicket) => {
                    const findResult = movieTicketIdentifiers.find((movieTicketIdentifier) => {
                        return (movieTicketIdentifier.identifier === movieTicket.identifier);
                    });
                    if (findResult === undefined) {
                        movieTicketIdentifiers.push({
                            identifier: movieTicket.identifier, movieTickets: [movieTicket]
                        });
                        return;
                    }
                    findResult.movieTickets.push(movieTicket);

                });
                for (const movieTicketIdentifier of movieTicketIdentifiers) {
                    const authorizeMovieTicketPaymentResult = await this.cinerino.transaction.placeOrder.authorizeMovieTicketPayment({
                        object: {
                            typeOf: factory.paymentMethodType.MovieTicket,
                            amount: 0,
                            movieTickets: movieTicketIdentifier.movieTickets
                        },
                        purpose: transaction
                    });
                    authorizeMovieTicketPayments.push(authorizeMovieTicketPaymentResult);
                }

                return new purchase.AuthorizeMovieTicketSuccess({ authorizeMovieTicketPayments });
            } catch (error) {
                return new purchase.AuthorizeMovieTicketFail({ error: error });
            }
        })
    );
    /**
     * checkMovieTicket
     */
    @Effect()
    public checkMovieTicket = this.actions.pipe(
        ofType<purchase.CheckMovieTicket>(purchase.ActionTypes.CheckMovieTicket),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                await this.cinerino.getServices();
                const screeningEvent = payload.screeningEvent;
                const movieTickets = payload.movieTickets;
                const checkMovieTicketAction = await this.cinerino.payment.checkMovieTicket({
                    typeOf: factory.paymentMethodType.MovieTicket,
                    movieTickets: movieTickets.map((movieTicket) => {
                        return {
                            ...movieTicket,
                            serviceType: '', // 情報空でよし
                            serviceOutput: {
                                reservationFor: {
                                    typeOf: screeningEvent.typeOf,
                                    id: screeningEvent.id
                                },
                                reservedTicket: {
                                    ticketedSeat: {
                                        typeOf: factory.chevre.placeType.Seat,
                                        seatingType: <any>'', // 情報空でよし
                                        seatNumber: '', // 情報空でよし
                                        seatRow: '', // 情報空でよし
                                        seatSection: '' // 情報空でよし
                                    }
                                }
                            }
                        };
                    }),
                    seller: {
                        typeOf: payload.transaction.seller.typeOf,
                        id: payload.transaction.seller.id
                    }
                });

                return new purchase.CheckMovieTicketSuccess({ checkMovieTicketAction });
            } catch (error) {
                return new purchase.CheckMovieTicketFail({ error: error });
            }
        })
    );

    /**
     * reserve
     */
    @Effect()
    public reserve = this.actions.pipe(
        ofType<purchase.Reserve>(purchase.ActionTypes.Reserve),
        map(action => action.payload),
        mergeMap(async (payload) => {
            const transaction = payload.transaction;
            const screeningEvent = payload.screeningEvent;
            const reservations = payload.reservations;
            const seller = payload.seller;

            try {
                await this.cinerino.getServices();
                const result = await this.cinerino.transaction.placeOrder.confirm({
                    id: transaction.id,
                    options: {
                        sendEmailMessage: true,
                        emailTemplate: getPurchaseCompleteTemplate({
                            order: { date: moment().format('YYYY年MM月DD日(ddd) HH:mm') },
                            event: {
                                startDate: moment(screeningEvent.startDate).format('YYYY年MM月DD日(ddd) HH:mm'),
                                endDate: moment(screeningEvent.endDate).format('HH:mm')
                            },
                            workPerformedName: screeningEvent.workPerformed.name,
                            screen: {
                                name: screeningEvent.location.name.ja,
                                address: (screeningEvent.location.address !== undefined
                                    && screeningEvent.location.address.ja !== '')
                                    ? `(${screeningEvent.location.address.ja})`
                                    : ''
                            },
                            reservedSeats: reservations.map((reservation) => {
                                return format(
                                    '%s %s %s',
                                    reservation.seat.seatNumber,
                                    (reservation.ticket === undefined) ? '' : reservation.ticket.ticketOffer.name.ja,
                                    `￥${reservation.getTicketPrice().single}`
                                );
                            }).join('\n| '),
                            inquiryUrl: `${environment.SITE_URL}/#/inquiry/input`,
                            seller: {
                                telephone: (seller.telephone === undefined)
                                    ? '' : new LibphonenumberFormatPipe().transform(seller.telephone)
                            }
                        })
                    }
                });

                return new purchase.ReserveSuccess({ order: result.order });
            } catch (error) {
                await this.cinerino.transaction.placeOrder.cancel({
                    id: transaction.id
                });
                return new purchase.ReserveFail({ error: error });
            }
        })
    );

    /**
     * print
     */
    @Effect()
    public print = this.actions.pipe(
        ofType<purchase.Print>(purchase.ActionTypes.Print),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                const order = payload.order;
                const ipAddress = payload.ipAddress;
                const pos = payload.pos;
                this.starPrint.initialize({ ipAddress, pos });
                let printerRequests;
                if (order === undefined) {
                    printerRequests = await this.starPrint.createPrinterTestRequest();
                } else {
                    printerRequests = await this.starPrint.createPrinterRequestList({ order });
                }
                // n分割配列へ変換
                const divide = 4;
                const divideRequests: string[] = [];
                let divideRequest = '';
                printerRequests.forEach((request, index) => {
                    divideRequest += request;
                    if ((index + 1) % divide === 0) {
                        divideRequests.push(divideRequest);
                        divideRequest = '';
                    }
                });
                if (divideRequest !== '') {
                    divideRequests.push(divideRequest);
                }
                for (const printerRequest of divideRequests) {
                    // safari対応のため0.3秒待つ
                    await this.util.sleep(300);
                    await this.starPrint.print({ printerRequest });
                }

                return new purchase.PrintSuccess();
            } catch (error) {
                return new purchase.PrintFail({ error: error });
            }
        })
    );

    /**
     * getPurchaseHistory
     */
    @Effect()
    public getPurchaseHistory = this.actions.pipe(
        ofType<purchase.GetPurchaseHistory>(purchase.ActionTypes.GetPurchaseHistory),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                const params = Object.assign({ personId: 'me' }, payload.params);
                await this.cinerino.getServices();
                const searchOrdersResult = await this.cinerino.person.searchOrders(params);
                const orders = searchOrdersResult.data;
                return new purchase.GetPurchaseHistorySuccess({ result: orders });
            } catch (error) {
                return new purchase.GetPurchaseHistoryFail({ error: error });
            }
        })
    );

    /**
     * orderAuthorize
     */
    @Effect()
    public orderAuthorize = this.actions.pipe(
        ofType<purchase.OrderAuthorize>(purchase.ActionTypes.OrderAuthorize),
        map(action => action.payload),
        mergeMap(async (payload) => {
            try {
                const params = Object.assign({ personId: 'me' }, payload.params);
                await this.cinerino.getServices();
                const order = await this.cinerino.order.authorizeOwnershipInfos(params);
                return new purchase.OrderAuthorizeSuccess({ order });
            } catch (error) {
                return new purchase.OrderAuthorizeFail({ error: error });
            }
        })
    );

    /**
     * AuthorizeAnyPayment
     */
    @Effect()
    public addAuthorizeAnyPayment = this.actions.pipe(
        ofType<purchase.AuthorizeAnyPayment>(purchase.ActionTypes.AuthorizeAnyPayment),
        map(action => action.payload),
        mergeMap(async (payload) => {
            const transaction = payload.transaction;
            const typeOf = payload.typeOf;
            const amount = payload.amount;
            const additionalProperty = payload.additionalProperty;
            try {
                await this.cinerino.getServices();
                const authorizeAnyPayment =
                    await this.cinerino.transaction.placeOrder.authorizeAnyPayment({
                        object: { typeOf, amount, additionalProperty },
                        purpose: transaction
                    });
                return new purchase.AuthorizeAnyPaymentSuccess({ authorizeAnyPayment });
            } catch (error) {
                return new purchase.AuthorizeAnyPaymentFail({ error: error });
            }
        })
    );
}
