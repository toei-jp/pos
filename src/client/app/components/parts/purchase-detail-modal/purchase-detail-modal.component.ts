import { Component, Input, OnInit } from '@angular/core';
import { factory } from '@cinerino/api-javascript-client';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import * as qrcode from 'qrcode';
import { IPurchaseOrder } from '../../../models/history/purchaseOrder';

@Component({
    selector: 'app-purchase-detail-modal',
    templateUrl: './purchase-detail-modal.component.html',
    styleUrls: ['./purchase-detail-modal.component.scss']
})
export class PurchaseDetailModalComponent implements OnInit {
    @Input() public data: IPurchaseOrder;
    public moment: typeof moment = moment;
    public urlList: Promise<string>[];
    constructor(
        public activeModal: NgbActiveModal
    ) { }

    public ngOnInit() {
        this.urlList = [];
        this.data.acceptedOffers.forEach((acceptedOffer) => {
            if (acceptedOffer.itemOffered.typeOf !== factory.chevre.reservationType.EventReservation) {
                return;
            }
            const ticketToken = <string>acceptedOffer.itemOffered.reservedTicket.ticketToken;
            const basicSize = 21;
            const option: qrcode.QRCodeToDataURLOptions = {
                margin: 0,
                scale: (80 / basicSize)
            };
            const url = qrcode.toDataURL(ticketToken, option);
            this.urlList.push(url);
        });
    }

}
