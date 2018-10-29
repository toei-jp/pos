import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import * as libphonenumber from 'libphonenumber-js';
import { race } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { ActionTypes, Inquiry } from '../../../../store/actions/inquiry.action';
import * as reducers from '../../../../store/reducers';
import { AlertModalComponent } from '../../../parts/alert-modal/alert-modal.component';

@Component({
    selector: 'app-inquiry-input',
    templateUrl: './inquiry-input.component.html',
    styleUrls: ['./inquiry-input.component.scss']
})
export class InquiryInputComponent implements OnInit {
    public inquiryForm: FormGroup;
    constructor(
        private actions: Actions,
        private formBuilder: FormBuilder,
        private store: Store<reducers.IState>,
        private modal: NgbModal,
        private router: Router
    ) { }

    public ngOnInit() {
        this.createInquiryForm();
    }

    private createInquiryForm() {
        const TEL_MAX_LENGTH = 11;
        const TEL_MIN_LENGTH = 9;
        this.inquiryForm = this.formBuilder.group({
            confirmationNumber: ['', [
                Validators.required,
                Validators.pattern(/^[0-9]+$/)
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
            ]]
        });
    }

    public onSubmit() {
        Object.keys(this.inquiryForm.controls).forEach((key) => {
            this.inquiryForm.controls[key].markAsTouched();
        });
        if (this.inquiryForm.invalid) {
            return;
        }
        const confirmationNumber = Number(this.inquiryForm.controls.confirmationNumber.value);
        const telephone = this.inquiryForm.controls.telephone.value;
        this.store.dispatch(new Inquiry({
            confirmationNumber,
            customer: { telephone }
        }));
        const success = this.actions.pipe(
            ofType(ActionTypes.InquirySuccess),
            tap(() => {
                this.router.navigate(['/inquiry/confirm']);
            })
        );

        const fail = this.actions.pipe(
            ofType(ActionTypes.InquiryFail),
            tap(() => {
                this.openAlert({
                    title: 'エラー',
                    body: '入力情報に誤りがあります。'
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
