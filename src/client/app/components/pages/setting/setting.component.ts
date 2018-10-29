import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Actions, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import * as libphonenumber from 'libphonenumber-js';
import { Observable, race } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { LibphonenumberFormatPipe } from '../../../pipes/libphonenumber-format.pipe';
import * as purchaseAction from '../../../store/actions/purchase.action';
import * as userAction from '../../../store/actions/user.action';
import * as reducers from '../../../store/reducers';
import { AlertModalComponent } from '../../parts/alert-modal/alert-modal.component';

@Component({
    selector: 'app-setting',
    templateUrl: './setting.component.html',
    styleUrls: ['./setting.component.scss']
})
export class SettingComponent implements OnInit {
    public settingForm: FormGroup;
    public user: Observable<reducers.IUserState>;
    public error: Observable<string | null>;
    public posList: { id: string; name: string; typeOf: string; }[];
    constructor(
        private actions: Actions,
        private formBuilder: FormBuilder,
        private store: Store<reducers.IState>,
        private modal: NgbModal,
        private router: Router
    ) { }

    public ngOnInit() {
        this.user = this.store.pipe(select(reducers.getUser));
        this.error = this.store.pipe(select(reducers.getError));
        this.posList = [];
        this.getTheaters();
        this.createSettlingForm();
    }

    private createSettlingForm() {
        const NAME_MAX_LENGTH = 12;
        const MAIL_MAX_LENGTH = 50;
        const TEL_MAX_LENGTH = 11;
        const TEL_MIN_LENGTH = 9;

        this.settingForm = this.formBuilder.group({
            theaterCode: ['', [
                Validators.required
            ]],
            posId: ['', [
                Validators.required
            ]],
            familyName: ['', [
                Validators.required,
                Validators.maxLength(NAME_MAX_LENGTH),
                Validators.pattern(/^[ァ-ヶー]+$/)
            ]],
            givenName: ['', [
                Validators.required,
                Validators.maxLength(NAME_MAX_LENGTH),
                Validators.pattern(/^[ァ-ヶー]+$/)
            ]],
            email: ['', [
                Validators.required,
                Validators.maxLength(MAIL_MAX_LENGTH),
                Validators.email
            ]],
            telephone: ['', [
                Validators.required,
                Validators.maxLength(TEL_MAX_LENGTH),
                Validators.minLength(TEL_MIN_LENGTH),
                Validators.pattern(/^[0-9]+$/),
                (control: AbstractControl): ValidationErrors | null => {
                    const field = control.root.get('telephone');
                    if (field !== null) {
                        const parsedNumber = libphonenumber.parse(field.value, 'JP');
                        if (parsedNumber.phone === undefined) {
                            return { telephone: true };
                        }
                        const isValid = libphonenumber.isValidNumber(parsedNumber);
                        if (!isValid) {
                            return { telephone: true };
                        }
                    }

                    return null;
                }
            ]],
            printerIpAddress: ['', [
                Validators.required,
                Validators.pattern(/^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/)
            ]]
        });
        this.user.subscribe((user) => {
            if (user.movieTheater !== undefined) {
                this.settingForm.controls.theaterCode.setValue(user.movieTheater.location.branchCode);
            }
            if (user.pos !== undefined) {
                this.changePosList();
                this.settingForm.controls.posId.setValue(user.pos.id);
            }
            if (user.customerContact !== undefined) {
                this.settingForm.controls.familyName.setValue(user.customerContact.familyName);
                this.settingForm.controls.givenName.setValue(user.customerContact.givenName);
                this.settingForm.controls.email.setValue(user.customerContact.email);
                this.settingForm.controls.telephone.setValue(new LibphonenumberFormatPipe().transform(user.customerContact.telephone));
            }
            if (user.printer !== undefined) {
                this.settingForm.controls.printerIpAddress.setValue(user.printer.ipAddress);
            }
        }).unsubscribe();
    }

    public changePosList() {
        this.settingForm.controls.posId.setValue('');
        const theaterCode = this.settingForm.controls.theaterCode.value;
        if (theaterCode === '') {
            this.posList = [];
            return;
        }
        this.user.subscribe((user) => {
            const findTheater =
                user.movieTheaters.find(theater => theater.location.branchCode === theaterCode);
            if (findTheater === undefined) {
                this.posList = [];
                return;
            }
            this.posList = (<any>findTheater).hasPOS;
        }).unsubscribe();
    }

    /**
     * getTheaters
     */
    public getTheaters() {
        this.store.dispatch(new userAction.GetTheaters({ params: {} }));

        const success = this.actions.pipe(
            ofType(userAction.ActionTypes.GetTheatersSuccess),
            tap(() => { })
        );

        const fail = this.actions.pipe(
            ofType(userAction.ActionTypes.GetTheatersFail),
            tap(() => {
                this.router.navigate(['/error']);
            })
        );
        race(success, fail).pipe(take(1)).subscribe();
    }

    public onSubmit() {
        Object.keys(this.settingForm.controls).forEach((key) => {
            this.settingForm.controls[key].markAsTouched();
        });
        if (this.settingForm.invalid) {
            this.openAlert({
                title: 'エラー',
                body: '入力内容に誤りがあります。'
            });
            return;
        }
        this.user.subscribe((user) => {
            const findMovieTheater = user.movieTheaters.find((theater) => {
                return theater.location.branchCode === this.settingForm.controls.theaterCode.value;
            });
            if (findMovieTheater === undefined) {
                return;
            }
            const findPos = (<any>findMovieTheater).hasPOS.find((pos: any) => {
                return pos.id === this.settingForm.controls.posId.value;
            });
            if (findPos === undefined) {
                return;
            }
            this.store.dispatch(new userAction.UpdateAll({
                movieTheater: findMovieTheater,
                pos: findPos,
                customerContact: {
                    familyName: this.settingForm.controls.familyName.value,
                    givenName: this.settingForm.controls.givenName.value,
                    email: this.settingForm.controls.email.value,
                    telephone: this.settingForm.controls.telephone.value
                },
                printer: {
                    ipAddress: this.settingForm.controls.printerIpAddress.value
                }
            }));
            this.openAlert({
                title: '完了',
                body: '設定を保存しました。'
            });

        }).unsubscribe();

    }

    public print() {
        const ipAddress = this.settingForm.controls.printerIpAddress.value;
        this.store.dispatch(new purchaseAction.Print({ ipAddress }));

        const success = this.actions.pipe(
            ofType(purchaseAction.ActionTypes.PrintSuccess),
            tap(() => { })
        );

        const fail = this.actions.pipe(
            ofType(purchaseAction.ActionTypes.PrintFail),
            tap(() => {
                this.error.subscribe((json) => {
                    let message = '印刷に失敗しました';
                    if (json !== null) {
                        const error = JSON.parse(json);
                        message = error.message;
                    }
                    this.openAlert({
                        title: 'エラー',
                        body: message
                    });
                }).unsubscribe();
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
