import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { factory } from '@cinerino/api-javascript-client';
import { Actions, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import * as moment from 'moment';
import { Observable, race } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
    ActionTypes,
    Delete,
    GetSchedule,
    SelectSchedule,
    SelectScheduleDate,
    SelectTheater,
    StartTransaction
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
    public scheduleDateValue: string;
    private updateTimer: any;
    constructor(
        private store: Store<reducers.IState>,
        private actions: Actions,
        private router: Router
    ) { }

    public async ngOnInit() {
        this.store.dispatch(new Delete({}));
        this.purchase = this.store.pipe(select(reducers.getPurchase));
        this.user = this.store.pipe(select(reducers.getUser));
        this.user.subscribe((user) => {
            if (user.movieTheater === undefined) {
                this.router.navigate(['/error']);
                return;
            }
            this.selectTheater(user.movieTheater);
            this.update(user.movieTheater);
        }).unsubscribe();
    }

    public ngOnDestroy() {
        clearInterval(this.updateTimer);
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
        const today = moment().format('YYYYMMDD');
        this.store.dispatch(new GetSchedule({
            params: {
                startFrom: moment(today).toDate(),
                startThrough: moment(today).add(1, 'month').toDate(),
                superEvent: {
                    locationBranchCodes: [movieTheater.location.branchCode]
                }
            }
        }));

        const success = this.actions.pipe(
            ofType(ActionTypes.GetScheduleSuccess),
            tap(() => {
                this.purchase.subscribe((purchase) => {
                    if (purchase.scheduleDate === undefined) {
                        return;
                    }
                    this.scheduleDateValue = purchase.scheduleDate.format;
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
     * selectDate
     */
    public selectDate() {
        this.purchase.subscribe((purchase) => {
            if (purchase.scheduleDate === undefined) {
                return;
            }
            const findResult = purchase.scheduleDates.find((scheduleDate) => {
                return (scheduleDate.format === this.scheduleDateValue);
            });

            if (findResult === undefined) {
                return;
            }
            this.store.dispatch(new SelectScheduleDate({ scheduleDate: findResult }));
        }).unsubscribe();
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
                this.router.navigate(['/error']);
            })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

}
