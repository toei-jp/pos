import { factory } from '@cinerino/api-javascript-client';
import { IScreen, Reservation } from '../../models';
import * as inquiry from '../actions/inquiry.action';
import * as purchase from '../actions/purchase.action';
import * as user from '../actions/user.action';
import {
    createPaymentMethodFromType,
    createscreeningEventDates,
    createScreeningFilmEvents,
    isAvailabilityMovieTicket,
    IScreeningEventDate,
    IScreeningEventFilm,
    sameMovieTicketFilter
} from '../functions';

/**
 * IPurchaseState
 */
export interface IPurchaseState {
    movieTheaters: factory.organization.movieTheater.IOrganization[];
    movieTheater?: factory.organization.movieTheater.IOrganization;
    screeningEvents: factory.chevre.event.screeningEvent.IEvent[];
    screeningEvent?: factory.chevre.event.screeningEvent.IEvent;
    scheduleDates: IScreeningEventDate[];
    scheduleDate?: IScreeningEventDate;
    screeningFilmEvents: IScreeningEventFilm[];
    transaction?: factory.transaction.placeOrder.ITransaction;
    screeningEventOffers: factory.chevre.event.screeningEvent.IScreeningRoomSectionOffer[];
    screenData?: IScreen;
    reservations: Reservation[];
    screeningEventTicketOffers: factory.chevre.event.screeningEvent.ITicketOffer[];
    authorizeSeatReservation?: factory.action.authorize.offer.seatReservation.IAction;
    customerContact?: factory.transaction.placeOrder.ICustomerContact;
    authorizeCreditCardPayment?: factory.action.authorize.paymentMethod.creditCard.IAction;
    authorizeMovieTicketPayments: factory.action.authorize.paymentMethod.movieTicket.IAction[];
    gmoTokenObject?: any;
    orderCount: number;
    order?: factory.order.IOrder;
    checkMovieTicketActions: factory.action.check.paymentMethod.movieTicket.IAction[];
    checkMovieTicketAction?: factory.action.check.paymentMethod.movieTicket.IAction;
    authorizeAnyPayment?: factory.action.authorize.paymentMethod.any.IAction<any>;
    paymentMethod?: { name: string; typeOf: factory.paymentMethodType | string; };
}

export interface IHistoryState {
    purchase: factory.order.IOrder[];
}

export interface IInquiryState {
    order?: factory.order.IOrder;
}

export interface IUserState {
    movieTheaters: factory.organization.movieTheater.IOrganization[];
    movieTheater?: factory.organization.movieTheater.IOrganization;
    pos?: factory.organization.IPOS;
    customerContact?: factory.transaction.placeOrder.ICustomerContact;
    printer?: { ipAddress: string; };
}

/**
 * State
 */
export interface IState {
    loading: boolean;
    error: string | null;
    purchase: IPurchaseState;
    history: IHistoryState;
    inquiry: IInquiryState;
    user: IUserState;
}

/**
 * Initial state
 */
export const initialState: IState = {
    loading: false,
    error: null,
    purchase: {
        movieTheaters: [],
        screeningEvents: [],
        scheduleDates: [],
        screeningFilmEvents: [],
        screeningEventOffers: [],
        reservations: [],
        screeningEventTicketOffers: [],
        orderCount: 0,
        checkMovieTicketActions: [],
        authorizeMovieTicketPayments: []
    },
    history: {
        purchase: []
    },
    inquiry: {},
    user: {
        movieTheaters: []
    }
};

function getInitialState(): IState {
    const json = localStorage.getItem('state');
    if (json === undefined || json === null) {
        return initialState;
    }
    const data = JSON.parse(json);
    const reservations = data.App.purchase.reservations.map((reservation: Reservation) => new Reservation(reservation));
    data.App.purchase.reservations = reservations;

    return {
        loading: data.App.loading,
        error: data.App.error,
        purchase: data.App.purchase,
        history: data.App.history,
        inquiry: data.App.inquiry,
        user: data.App.user
    };
}

/**
 * Reducer
 * @param state
 * @param action
 */
export function reducer(
    state = getInitialState(),
    action: purchase.Actions | user.Actions | inquiry.Actions
): IState {
    switch (action.type) {
        case purchase.ActionTypes.Delete: {
            state.purchase = {
                movieTheaters: [],
                screeningEvents: [],
                scheduleDates: [],
                screeningFilmEvents: [],
                screeningEventOffers: [],
                reservations: [],
                screeningEventTicketOffers: [],
                orderCount: 0,
                checkMovieTicketActions: [],
                authorizeMovieTicketPayments: []
            };
            return { ...state };
        }
        case purchase.ActionTypes.GetTheaters: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.GetTheatersSuccess: {
            const movieTheaters = action.payload.movieTheaters;
            return { ...state, loading: false, error: null, purchase: { ...state.purchase, movieTheaters } };
        }
        case purchase.ActionTypes.GetTheatersFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.SelectTheater: {
            const movieTheater = action.payload.movieTheater;
            return { ...state, loading: false, error: null, purchase: { ...state.purchase, movieTheater } };
        }
        case purchase.ActionTypes.SelectScheduleDate: {
            const scheduleDate = action.payload.scheduleDate;
            const screeningEvents = state.purchase.screeningEvents;
            const screeningFilmEvents = createScreeningFilmEvents({ screeningEvents, scheduleDate });
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    scheduleDate,
                    screeningFilmEvents
                }
            };
        }
        case purchase.ActionTypes.GetSchedule: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.GetScheduleSuccess: {
            const screeningEvents = action.payload.screeningEvents;
            const scheduleDates = createscreeningEventDates(screeningEvents);
            const scheduleDate = scheduleDates[0];
            const screeningFilmEvents = createScreeningFilmEvents({ screeningEvents, scheduleDate });
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    screeningEvents,
                    scheduleDates,
                    scheduleDate,
                    screeningFilmEvents
                }
            };
        }
        case purchase.ActionTypes.GetScheduleFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.SelectSchedule: {
            const screeningEvent = action.payload.screeningEvent;
            return {
                ...state, loading: false, purchase: {
                    ...state.purchase,
                    screeningEvent
                }
            };
        }
        case purchase.ActionTypes.StartTransaction: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.StartTransactionSuccess: {
            state.purchase.transaction = action.payload.transaction;
            state.purchase.screeningEvents = [];
            state.purchase.movieTheaters = [];
            state.purchase.screeningFilmEvents = [];
            return { ...state, loading: false, error: null };
        }
        case purchase.ActionTypes.StartTransactionFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.GetScreen: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.GetScreenSuccess: {
            const screeningEventOffers = action.payload.screeningEventOffers;
            const screenData = action.payload.screenData;
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    screeningEventOffers,
                    screenData
                }
            };
        }
        case purchase.ActionTypes.GetScreenFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.SelectSeat: {
            state.purchase.reservations.push(new Reservation({ seat: action.payload.seat }));
            const reservations = state.purchase.reservations;
            return { ...state, loading: false, error: null, purchase: { ...state.purchase, reservations } };
        }
        case purchase.ActionTypes.CancelSeat: {
            const reservations = state.purchase.reservations.filter((reservation) => {
                return (reservation.seat.seatNumber !== action.payload.seat.seatNumber
                    || reservation.seat.seatSection !== action.payload.seat.seatSection);
            });
            return { ...state, loading: false, error: null, purchase: { ...state.purchase, reservations } };
        }
        case purchase.ActionTypes.GetTicketList: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.GetTicketListSuccess: {
            const screeningEventTicketOffers = action.payload.screeningEventTicketOffers;
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    screeningEventTicketOffers
                }
            };
        }
        case purchase.ActionTypes.GetTicketListFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.SelectTicket: {
            const reservations: Reservation[] = [];
            state.purchase.reservations.forEach((reservation) => {
                if (Object.is(reservation, action.payload.reservation)) {
                    reservations.push(action.payload.reservation);
                } else {
                    reservations.push(reservation);
                }
            });
            return {
                ...state, purchase: {
                    ...state.purchase,
                    reservations
                }
            };
        }
        case purchase.ActionTypes.TemporaryReservation: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.TemporaryReservationSuccess: {
            const authorizeSeatReservation = action.payload.authorizeSeatReservation;
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    authorizeSeatReservation
                }
            };
        }
        case purchase.ActionTypes.TemporaryReservationFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.RegisterContact: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.RegisterContactSuccess: {
            const customerContact = action.payload.customerContact;
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    customerContact
                }
            };
        }
        case purchase.ActionTypes.RegisterContactFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.AuthorizeCreditCard: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.AuthorizeCreditCardSuccess: {
            const authorizeCreditCardPayment = action.payload.authorizeCreditCardPayment;
            const gmoTokenObject = action.payload.gmoTokenObject;
            const orderCount = state.purchase.orderCount + 1;
            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    authorizeCreditCardPayment,
                    gmoTokenObject,
                    orderCount
                }
            };
        }
        case purchase.ActionTypes.AuthorizeCreditCardFail: {
            const error = action.payload.error;
            const orderCount = state.purchase.orderCount + 1;
            return {
                ...state, loading: false,
                error: JSON.stringify(error),
                purchase: {
                    ...state.purchase,
                    orderCount: orderCount
                }
            };
        }
        case purchase.ActionTypes.AuthorizeMovieTicket: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.AuthorizeMovieTicketSuccess: {
            state.purchase.authorizeMovieTicketPayments = action.payload.authorizeMovieTicketPayments;
            return { ...state, loading: false, error: null };
        }
        case purchase.ActionTypes.AuthorizeMovieTicketFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.CheckMovieTicket: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.CheckMovieTicketSuccess: {
            const checkMovieTicketAction = action.payload.checkMovieTicketAction;
            const checkMovieTicketActions = state.purchase.checkMovieTicketActions;
            const sameMovieTicketFilterResults = sameMovieTicketFilter({
                checkMovieTicketAction, checkMovieTicketActions
            });
            if (sameMovieTicketFilterResults.length === 0
                && isAvailabilityMovieTicket(checkMovieTicketAction)) {
                state.purchase.checkMovieTicketActions.push(checkMovieTicketAction);
            }

            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    checkMovieTicketAction: checkMovieTicketAction
                }
            };
        }
        case purchase.ActionTypes.CheckMovieTicketFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.Reserve: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.ReserveSuccess: {
            const order = action.payload.order;
            state.purchase.order = order;
            return { ...state, loading: false, error: null };
        }
        case purchase.ActionTypes.ReserveFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.Print: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.PrintSuccess: {
            return { ...state, loading: false, error: null };
        }
        case purchase.ActionTypes.PrintFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.GetPurchaseHistory: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.GetPurchaseHistorySuccess: {
            const result = action.payload.result;
            return {
                ...state, loading: false, error: null, history: {
                    ...state.history,
                    purchase: result
                }
            };
        }
        case purchase.ActionTypes.GetPurchaseHistoryFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.OrderAuthorize: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.OrderAuthorizeSuccess: {
            const authorizeOrder = action.payload.order;
            const historyData = state.history.purchase.map((order) => {
                if (order.orderNumber !== authorizeOrder.orderNumber) {
                    return order;
                }
                return authorizeOrder;
            });
            const history = state.history;
            history.purchase = historyData;

            return { ...state, loading: false, error: null, history };
        }
        case purchase.ActionTypes.OrderAuthorizeFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.AuthorizeAnyPayment: {
            return { ...state, loading: true };
        }
        case purchase.ActionTypes.AuthorizeAnyPaymentSuccess: {
            const authorizeAnyPayment = action.payload.authorizeAnyPayment;

            return {
                ...state, loading: false, error: null, purchase: {
                    ...state.purchase,
                    authorizeAnyPayment
                }
            };
        }
        case purchase.ActionTypes.AuthorizeAnyPaymentFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case purchase.ActionTypes.SelectPaymentMethodType: {
            const paymentMethod = createPaymentMethodFromType({
                paymentMethodType: action.payload.paymentMethodType
            });
            state.purchase.paymentMethod = paymentMethod;

            return { ...state, loading: false, error: null };
        }
        case inquiry.ActionTypes.Delete: {
            state.inquiry = {};
            return { ...state };
        }
        case inquiry.ActionTypes.Inquiry: {
            return { ...state, loading: true };
        }
        case inquiry.ActionTypes.InquirySuccess: {
            const order = action.payload.order;
            return {
                ...state, loading: false, error: null, inquiry: {
                    order
                }
            };
        }
        case inquiry.ActionTypes.InquiryFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        case user.ActionTypes.Delete: {
            return { ...state, loading: false };
        }
        case user.ActionTypes.UpdateAll: {
            const customerContact = action.payload.customerContact;
            const movieTheater = action.payload.movieTheater;
            const pos = action.payload.pos;
            const printer = action.payload.printer;
            state.user.customerContact = customerContact;
            state.user.movieTheater = movieTheater;
            state.user.pos = pos;
            state.user.printer = printer;

            return { ...state, loading: false };
        }
        case user.ActionTypes.GetTheaters: {
            return { ...state, loading: true };
        }
        case user.ActionTypes.GetTheatersSuccess: {
            const movieTheaters = action.payload.movieTheaters;
            return {
                ...state, loading: false, error: null, user: {
                    ...state.user, movieTheaters
                }
            };
        }
        case user.ActionTypes.GetTheatersFail: {
            const error = action.payload.error;
            return { ...state, loading: false, error: JSON.stringify(error) };
        }
        default: {
            return state;
        }
    }
}

/**
 * Selectors
 */
export const getLoading = (state: IState) => state.loading;
export const getError = (state: IState) => state.error;
export const getPurchase = (state: IState) => state.purchase;
export const getHistory = (state: IState) => state.history;
export const getInquiry = (state: IState) => state.inquiry;
export const getUser = (state: IState) => state.user;
