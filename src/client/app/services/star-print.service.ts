import { Injectable } from '@angular/core';
import { factory } from '@cinerino/api-javascript-client';
import * as moment from 'moment';
import * as qrcode from 'qrcode';
import { CinerinoService } from './cinerino.service';

@Injectable({
    providedIn: 'root'
})
export class StarPrintService {
    /**
     * 使用端末ID
     */
    public pos?: factory.organization.IPOS;
    /**
     * 印刷内容生成インスタンス
     */
    public builder: any;
    /**
     * 制御用インスタンス
     */
    public trader: any;
    /**
     * プリンター使用状況
     */
    public isReady: boolean;

    constructor(
        private cinerino: CinerinoService
    ) { }

    /**
     * 初期化
     */
    public initialize(args: {
        ipAddress: string;
        pos?: factory.organization.IPOS;
        timeout?: number;
    }) {
        this.pos = args.pos;
        this.builder = new (<any>window).StarWebPrintBuilder();
        this.isReady = false;

        try {
            if (args.ipAddress === '') {
                throw new Error('プリンターのIPアドレスが正しく指定されていません');
            }
            const port = /https/.test(window.location.protocol) ? 443 : 80;
            const url = `//${args.ipAddress}:${port}/StarWebPRNT/SendMessage`;
            const papertype = 'normal';
            const blackmark_sensor = 'front_side';
            // trader設定
            this.trader = new (<any>window).StarWebPrintTrader({ url, papertype, blackmark_sensor });
            // プリンター通信タイムアウト
            this.trader.timeout = (args.timeout === undefined) ? 10000 : args.timeout;

            this.isReady = true;
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 受信データから状態取得
     */
    private getStatusByReceivedResponse(response: any) {
        let isSuccess = true;
        let message = '';
        try {
            if (this.trader.isOffLine({ traderStatus: response.traderStatus })) {
                message += 'プリンターがオフラインです\n';
                isSuccess = false;
            }
            if (this.trader.isNonRecoverableError({ traderStatus: response.traderStatus })) {
                message += 'プリンターに復帰不可能エラーが発生しています\n';
                isSuccess = false;
            }
            if (response.traderCode === '1100') {
                message += 'プリンターまたはご利用端末が通信不能な状態です\n';
                isSuccess = false;
            }
            if (response.traderCode === '2001') {
                message += 'プリンターがビジー状態です\n';
                isSuccess = false;
            }
            if (this.trader.isHighTemperatureStop({ traderStatus: response.traderStatus })) {
                message += '印字ヘッドが高温のため停止しています\n';
                isSuccess = false;
            }
            if (this.trader.isAutoCutterError({ traderStatus: response.traderStatus })) {
                message += '用紙カッターに異常が起きています\n';
                isSuccess = false;
            }
            if (this.trader.isBlackMarkError({ traderStatus: response.traderStatus })) {
                message += 'ブラックマークエラー\n';
                isSuccess = false;
            }
            if (this.trader.isCoverOpen({ traderStatus: response.traderStatus })) {
                message += 'プリンターカバーが開いています\n';
                isSuccess = false;
            }
            if (this.trader.isPaperEnd({ traderStatus: response.traderStatus })) {
                message += '用紙切れです\n';
                isSuccess = false;
            }
            if (!response.traderSuccess || response.traderCode !== '0') {
                isSuccess = false;
            }
        } catch (error) {
            message = error.message;
        }
        return { isSuccess, message, response };
    }

    /**
     * 印刷イメージ作成
     */
    private async createPrintImage(args: {
        size: { width: number; height: number; },
        order: factory.order.IOrder;
        offerIndex: number;
    }) {
        const canvas = document.createElement('canvas');
        canvas.width = args.size.width;
        canvas.height = args.size.height;
        const context = canvas.getContext('2d');
        if (context === null) {
            throw new Error('context is null');
        }
        const left = 0;
        const right = canvas.width;
        const bottom = args.size.height;
        const center = canvas.width / 2;
        const order = args.order;
        const acceptedOffer = order.acceptedOffers[args.offerIndex];
        const data = {
            confirmationNumber: args.order.confirmationNumber,
            theaterName: order.acceptedOffers[0].itemOffered.reservationFor.superEvent.location.name.ja,
            screenName: order.acceptedOffers[0].itemOffered.reservationFor.location.name.ja,
            eventName: order.acceptedOffers[0].itemOffered.reservationFor.name.ja,
            startDate: moment(order.acceptedOffers[0].itemOffered.reservationFor.startDate).format('YYYY/MM/DD (ddd) HH:mm'),
            seatNumber: acceptedOffer.itemOffered.reservedTicket.ticketedSeat.seatNumber,
            ticketName: acceptedOffer.itemOffered.reservedTicket.ticketType.name.ja,
            price: acceptedOffer.itemOffered.reservedTicket.totalPrice,
            qrcode: <string>acceptedOffer.itemOffered.reservedTicket.ticketToken
        };

        // 劇場
        context.fillStyle = 'black';
        context.font = 'normal 24px sans-serif';
        context.textAlign = 'center';
        context.fillText(data.theaterName, center, 30);
        // 鑑賞日時
        context.font = 'bold 30px sans-serif';
        context.fillText(data.startDate, center, 70);
        context.strokeStyle = '#000';
        context.beginPath();
        context.moveTo(80, 80);
        context.lineTo((canvas.width - 80), 80);
        context.closePath();
        context.stroke();
        // 作品名
        context.font = 'normal 30px sans-serif';
        const title = data.eventName;
        const titleLimit = 18;
        if (title.length > titleLimit) {
            context.fillText(title.slice(0, titleLimit), center, 120);
            context.fillText(title.slice(titleLimit, title.length), center, 160);
        } else {
            context.fillText(title, center, 120);
        }
        // スクリーン
        context.beginPath();
        context.fillRect(0, 170, canvas.width, 50);
        context.font = 'bold 40px sans-serif';
        context.fillStyle = '#FFF';
        context.fillText(data.screenName, center, 210);
        // 座席
        context.beginPath();
        context.lineWidth = 2;
        context.strokeRect(1, 220, canvas.width - 2, 50);
        context.strokeRect(0, 220, canvas.width, 50);
        context.fillStyle = '#000';
        context.fillText(data.seatNumber, center, 260);
        // 券種
        context.textAlign = 'left';
        context.font = 'normal 30px sans-serif';
        context.fillText(data.ticketName, 0, 310);
        // 金額
        context.textAlign = 'right';
        context.fillText('￥' + data.price + '-', right, 310);
        // QR
        const qrcodeCanvas = document.createElement('canvas');
        await qrcode.toCanvas(qrcodeCanvas, data.qrcode);
        context.drawImage(qrcodeCanvas, (canvas.width - 120), 320, 120, 120);
        // 発券時間
        context.textAlign = 'left';
        context.font = 'normal 24px sans-serif';
        const date = moment().format('YYYY/MM/DD HH:mm');
        context.fillText(date, left, bottom);
        // 購入番号
        context.fillText(`購入番号 ${data.confirmationNumber}`, left, bottom - 60);
        if (this.pos !== undefined) {
            // 端末
            context.fillText(`端末 ${this.pos.name}`, left, bottom - 30);
        }

        return {
            context,
            x: 0,
            y: 0,
            width: 560,
            height: 450
        };
    }

    /**
     * プリンターリクエスト作成
     */
    private async createPrinterRequest(args: {
        order: factory.order.IOrder;
        offerIndex: number;
    }) {
        let request = '';
        const printImage = await this.createPrintImage({
            size: { width: 560, height: 450 },
            order: args.order,
            offerIndex: args.offerIndex
        });
        request = this.builder.createBitImageElement(printImage);
        // 紙を切断
        request += this.builder.createCutPaperElement({ feed: true, type: 'partial' });

        return request;
    }

    /**
     * 印刷テスト用イメージ作成
     */
    private async createPrintTestImage(args: {
        size: { width: number; height: number; }
    }) {
        const canvas = document.createElement('canvas');
        canvas.width = args.size.width;
        canvas.height = args.size.height;
        const context = canvas.getContext('2d');
        if (context === null) {
            throw new Error('context is null');
        }
        const left = 0;
        const right = canvas.width;
        const bottom = args.size.height;
        const center = canvas.width / 2;
        const data = {
            confirmationNumber: '12345678',
            theaterName: 'テスト劇場',
            screenName: 'テストスクリーン',
            eventName: 'テスト作品',
            startDate: moment().format('YYYY/MM/DD (ddd) HH:mm'),
            seatNumber: 'TEST-1',
            ticketName: 'テスト券種',
            price: '1000'
        };

        // 劇場
        context.fillStyle = 'black';
        context.font = 'normal 24px sans-serif';
        context.textAlign = 'center';
        context.fillText(data.theaterName, center, 30);
        // 鑑賞日時
        context.font = 'bold 30px sans-serif';
        context.fillText(data.startDate, center, 70);
        context.strokeStyle = '#000';
        context.beginPath();
        context.moveTo(80, 80);
        context.lineTo((canvas.width - 80), 80);
        context.closePath();
        context.stroke();
        // 作品名
        context.font = 'normal 30px sans-serif';
        const title = data.eventName;
        const titleLimit = 18;
        if (title.length > titleLimit) {
            context.fillText(title.slice(0, titleLimit), center, 120);
            context.fillText(title.slice(titleLimit, title.length), center, 160);
        } else {
            context.fillText(title, center, 120);
        }
        // スクリーン
        context.beginPath();
        context.fillRect(0, 170, canvas.width, 50);
        context.font = 'bold 40px sans-serif';
        context.fillStyle = '#FFF';
        context.fillText(data.screenName, center, 210);
        // 座席
        context.beginPath();
        context.lineWidth = 2;
        context.strokeRect(1, 220, canvas.width - 2, 50);
        context.strokeRect(0, 220, canvas.width, 50);
        context.fillStyle = '#000';
        context.fillText(data.seatNumber, center, 260);
        // 券種
        context.textAlign = 'left';
        context.font = 'normal 30px sans-serif';
        context.fillText(data.ticketName, 0, 310);
        // 金額
        context.textAlign = 'right';
        context.fillText('￥' + data.price + '-', right, 310);
        // QR
        const qrcodeCanvas = document.createElement('canvas');
        await qrcode.toCanvas(qrcodeCanvas, 'QRコード文字列');
        context.drawImage(qrcodeCanvas, (canvas.width - 120), 320, 120, 120);
        // 発券時間
        context.textAlign = 'left';
        context.font = 'normal 24px sans-serif';
        const date = moment().format('YYYY/MM/DD HH:mm');
        context.fillText(date, left, bottom);
        // 購入番号
        context.fillText(`購入番号 ${data.confirmationNumber}`, left, bottom - 60);
        // 端末
        context.fillText(`端末 TEST`, left, bottom - 30);

        return {
            context,
            x: 0,
            y: 0,
            width: 560,
            height: 450
        };
    }

    /**
     * プリンターテストリクエスト作成
     */
    public async createPrinterTestRequest() {
        let request = '';
        const printImage = await this.createPrintTestImage({
            size: { width: 560, height: 450 }
        });
        request = this.builder.createBitImageElement(printImage);
        // 紙を切断
        request += this.builder.createCutPaperElement({ feed: true, type: 'partial' });

        return request;
    }

    /**
     * プリンターリクエストリスト作成
     */
    public async createPrinterRequestList(args: {
        order: factory.order.IOrder;
    }) {
        let printerRequest = '';
        const orderNumber = args.order.orderNumber;
        const customer = {
            // email: args.order.customer.email,
            telephone: args.order.customer.telephone
        };
        await this.cinerino.getServices();
        const order = await this.cinerino.order.authorizeOwnershipInfos({ orderNumber, customer });
        for (let i = 0; i < args.order.acceptedOffers.length; i++) {
            printerRequest += await this.createPrinterRequest({
                order,
                offerIndex: i
            });
        }

        return printerRequest;
    }

    /**
     * 印刷
     */
    public async print(args: {
        printerRequest: string;
    }) {
        return new Promise<void>((resolve, reject) => {
            if (!this.isReady) {
                reject({
                    isSuccess: false,
                    message: 'プリンターが初期化されていません',
                    response: undefined
                });

                return;
            }

            // 印刷命令送信後処理
            this.trader.onReceive = (response: any) => {
                const result = this.getStatusByReceivedResponse(response);
                if (!result.isSuccess) {
                    reject(result);

                    return;
                }
                resolve();
            };

            // 印刷命令失敗処理
            this.trader.onError = (response: any) => {
                reject({
                    isSuccess: false,
                    message: 'プリンターとの通信に失敗しました',
                    response
                });
            };

            // プリンターに送信
            this.trader.sendMessage({ request: args.printerRequest });
        });
    }
}
