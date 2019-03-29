import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { factory } from '@cinerino/api-javascript-client';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Actions, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import * as moment from 'moment';
import { Observable, race } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { getTicketPrice } from '../../../../functions';
import { Print } from '../../../../store/actions/purchase.action';
import { ActionTypes } from '../../../../store/actions/purchase.action';
import * as reducers from '../../../../store/reducers';
import { AlertModalComponent } from '../../../parts/alert-modal/alert-modal.component';

@Component({
    selector: 'app-inquiry-confirm',
    templateUrl: './inquiry-confirm.component.html',
    styleUrls: ['./inquiry-confirm.component.scss']
})
export class InquiryConfirmComponent implements OnInit {
    public inquiry: Observable<reducers.IInquiryState>;
    public user: Observable<reducers.IUserState>;
    public isLoading: Observable<boolean>;
    public error: Observable<string | null>;
    public moment: typeof moment = moment;
    public getTicketPrice = getTicketPrice;
    public isPrint: boolean;

    constructor(
        private store: Store<reducers.IState>,
        private actions: Actions,
        private router: Router,
        private modal: NgbModal
    ) { }

    public ngOnInit() {
        this.inquiry = this.store.pipe(select(reducers.getInquiry));
        this.user = this.store.pipe(select(reducers.getUser));
        this.isLoading = this.store.pipe(select(reducers.getLoading));
        this.error = this.store.pipe(select(reducers.getError));
        this.isPrint = false;
        this.inquiry.subscribe((inquiry) => {
            if (inquiry.order === undefined) {
                this.router.navigate(['/error']);
                return;
            }
            const itemOffered = inquiry.order.acceptedOffers[0].itemOffered;
            if (itemOffered.typeOf !== factory.chevre.reservationType.EventReservation) {
                this.router.navigate(['/error']);
                return;
            }
            const date = moment(itemOffered.reservationFor.startDate).format('YYYY-MM-DD');
            const today = moment().format('YYYY-MM-DD');
            this.isPrint = moment(date).unix() >= moment(today).unix() && moment(date).unix() < moment(today).add(2, 'day').unix();
            console.log(this.isPrint, date);
        }).unsubscribe();
    }

    public print() {
        this.inquiry.subscribe((inquiry) => {
            this.user.subscribe((user) => {
                if (inquiry.order === undefined
                    || user.pos === undefined
                    || user.printer === undefined) {
                    this.router.navigate(['/error']);
                    return;
                }
                const order = inquiry.order;
                const pos = user.pos;
                const ipAddress = user.printer.ipAddress;
                this.store.dispatch(new Print({ order, pos, ipAddress }));
            }).unsubscribe();
        }).unsubscribe();

        const success = this.actions.pipe(
            ofType(ActionTypes.PrintSuccess),
            tap(() => { })
        );

        const fail = this.actions.pipe(
            ofType(ActionTypes.PrintFail),
            tap(() => {
                this.openAlert({
                    title: 'エラー',
                    body: '印刷に失敗しました'
                });
            })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

    public openAlert(args: {
        title: string;
        body: string;
    }) {
        const modalRef = this.modal.open(AlertModalComponent, {
            centered: true
        });
        modalRef.componentInstance.title = args.title;
        modalRef.componentInstance.body = args.body;
    }

}
