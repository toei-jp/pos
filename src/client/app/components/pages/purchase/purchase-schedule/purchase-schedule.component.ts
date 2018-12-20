import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { factory } from '@cinerino/api-javascript-client';
import { Actions, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { SERVICE_UNAVAILABLE, TOO_MANY_REQUESTS } from 'http-status';
import * as moment from 'moment';
import { Observable, race } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
    ActionTypes,
    Delete,
    GetSchedule,
    SelectSchedule,
    SelectTheater,
    StartTransaction,
    TemporaryReservationCancel
} from '../../../../store/actions/purchase.action';
import * as reducers from '../../../../store/reducers';

@Component({
    selector: 'app-purchase-schedule',
    templateUrl: './purchase-schedule.component.html',
    styleUrls: ['./purchase-schedule.component.scss']
})
export class PurchaseScheduleComponent implements OnInit, OnDestroy {
    public purchase: Observable<reducers.IPurchaseState>;
    public user: Observable<reducers.IUserState>;
    public error: Observable<string | null>;
    public scheduleDate: string;
    private updateTimer: any;
    constructor(
        private store: Store<reducers.IState>,
        private actions: Actions,
        private router: Router
    ) { }

    public async ngOnInit() {
        this.store.dispatch(new Delete());
        this.purchase = this.store.pipe(select(reducers.getPurchase));
        this.error = this.store.pipe(select(reducers.getError));
        this.user = this.store.pipe(select(reducers.getUser));
        this.temporaryReservationCancel();
        this.user.subscribe((user) => {
            if (user.movieTheater === undefined) {
                this.router.navigate(['/error']);
                return;
            }
            this.selectTheater(user.movieTheater);
            this.selectDate();
            this.update(user.movieTheater);
        }).unsubscribe();
    }

    public ngOnDestroy() {
        clearInterval(this.updateTimer);
    }

    private temporaryReservationCancel() {
        this.purchase.subscribe((purchase) => {
            if (purchase.authorizeSeatReservation !== undefined) {
                const authorizeSeatReservation = purchase.authorizeSeatReservation;
                this.store.dispatch(new TemporaryReservationCancel({ authorizeSeatReservation }));
            }
        }).unsubscribe();

        const success = this.actions.pipe(
            ofType(ActionTypes.TemporaryReservationCancelSuccess),
            tap(() => { })
        );

        const fail = this.actions.pipe(
            ofType(ActionTypes.TemporaryReservationCancelFail),
            tap(() => { })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

    private update(movieTheater: factory.organization.movieTheater.IOrganization) {
        const time = 600000; // 10 * 60 * 1000
        this.updateTimer = setInterval(() => {
            this.selectTheater(movieTheater);
        }, time);
    }

    /**
     * selectTheater
     */
    public selectTheater(movieTheater: factory.organization.movieTheater.IOrganization) {
        this.store.dispatch(new SelectTheater({ movieTheater }));
    }

    /**
     * selectDate
     */
    public selectDate() {
        this.purchase.subscribe((purchase) => {
            const movieTheater = purchase.movieTheater;
            if (this.scheduleDate === undefined || this.scheduleDate === '') {
                this.scheduleDate = moment().format('YYYY-MM-DD');
            }
            const scheduleDate = this.scheduleDate;
            if (movieTheater === undefined) {
                return;
            }
            const body = document.getElementsByTagName('body');
            const now = moment().format('YYYY-MM-DD');
            body[0].style.backgroundColor = (scheduleDate > now) ? '#828407' : (scheduleDate < now) ? '#840707' : '#271916';
            this.store.dispatch(new GetSchedule({ movieTheater, scheduleDate }));
        }).unsubscribe();

        const success = this.actions.pipe(
            ofType(ActionTypes.GetScheduleSuccess),
            tap(() => {
                this.purchase.subscribe((purchase) => {
                    if (purchase.scheduleDate === undefined) {
                        return;
                    }
                    this.scheduleDate = purchase.scheduleDate;
                }).unsubscribe();
            })
        );

        const fail = this.actions.pipe(
            ofType(ActionTypes.GetScheduleFail),
            tap(() => {
                this.router.navigate(['/error']);
            })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

    /**
     * selectSchedule
     */
    public selectSchedule(screeningEvent: factory.chevre.event.screeningEvent.IEvent) {
        if (screeningEvent.remainingAttendeeCapacity === undefined
            || screeningEvent.remainingAttendeeCapacity === 0) {
            return;
        }
        this.store.dispatch(new SelectSchedule({ screeningEvent }));
        this.purchase.subscribe((purchase) => {
            this.user.subscribe((user) => {
                if (purchase.movieTheater === undefined
                    || user.pos === undefined) {
                    this.router.navigate(['/error']);
                    return;
                }
                this.store.dispatch(new StartTransaction({
                    params: {
                        expires: moment().add(environment.TRANSACTION_TIME, 'minutes').toDate(),
                        seller: {
                            typeOf: purchase.movieTheater.typeOf,
                            id: purchase.movieTheater.id
                        },
                        agent: {
                            identifier: [
                                { name: 'posId', value: user.pos.id },
                                { name: 'posName', value: user.pos.name }
                            ]
                        },
                        object: {}
                    }
                }));
            }).unsubscribe();
        }).unsubscribe();


        const success = this.actions.pipe(
            ofType(ActionTypes.StartTransactionSuccess),
            tap(() => {
                this.router.navigate(['/purchase/seat']);
            })
        );

        const fail = this.actions.pipe(
            ofType(ActionTypes.StartTransactionFail),
            tap(() => {
                this.error.subscribe((error) => {
                    try {
                        if (error === null) {
                            throw new Error('error is null');
                        }
                        const errorObject = JSON.parse(error);
                        if (errorObject.status === TOO_MANY_REQUESTS) {
                            this.router.navigate(['/congestion']);
                            return;
                        }
                        if (errorObject.status === SERVICE_UNAVAILABLE) {
                            this.router.navigate(['/maintenance']);
                            return;
                        }
                        throw new Error('error status not match');
                    } catch (error2) {
                        this.router.navigate(['/error']);
                    }
                });
            })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

}
