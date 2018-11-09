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
        const order = args.order;
        const acceptedOffer = order.acceptedOffers[args.offerIndex];
        const data = {
            confirmationNumber: args.order.confirmationNumber,
            theaterName: order.acceptedOffers[0].itemOffered.reservationFor.superEvent.location.name.ja,
            screenName: order.acceptedOffers[0].itemOffered.reservationFor.location.name.ja,
            eventName: order.acceptedOffers[0].itemOffered.reservationFor.name.ja,
            startDate: moment(order.acceptedOffers[0].itemOffered.reservationFor.startDate).format('YY/MM/DD (ddd) HH:mm'),
            seatNumber: acceptedOffer.itemOffered.reservedTicket.ticketedSeat.seatNumber,
            ticketName: acceptedOffer.itemOffered.reservedTicket.ticketType.name.ja,
            price: acceptedOffer.itemOffered.reservedTicket.totalPrice,
            qrcode: <string>acceptedOffer.itemOffered.reservedTicket.ticketToken
        };
        const context = await this.draw({
            canvas,
            size: args.size,
            data
        });

        return {
            context,
            x: 0,
            y: 0,
            width: args.size.width,
            height: args.size.height
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
            size: { width: 560, height: 730 },
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
        const context = await this.draw({
            canvas,
            size: args.size,
            data: {
                confirmationNumber: 12345678,
                theaterName: 'テスト劇場',
                screenName: 'テストスクリーン',
                eventName: 'テスト-----------------------------作品',
                startDate: moment().format('YY/MM/DD (ddd) HH:mm'),
                seatNumber: 'TEST-1',
                ticketName: 'テスト1234567890券種',
                price: 1000
            }
        });

        return {
            context,
            x: 0,
            y: 0,
            width: args.size.width,
            height: args.size.height
        };
    }

    /**
     * 印刷テスト用イメージ作成確認用
     */
    public async createPrintTestImageToCanvas(args: {
        size: { width: number; height: number; }
    }) {
        const canvas = (<HTMLCanvasElement>document.getElementById('test'));
        const context = await this.draw({
            canvas,
            size: args.size,
            data: {
                confirmationNumber: 12345678,
                theaterName: 'テストTOEI',
                screenName: 'テストスクリーン',
                eventName: 'テスト作品',
                startDate: moment().format('YY/MM/DD (ddd) HH:mm'),
                seatNumber: 'Z-1',
                ticketName: 'テスト券種',
                price: 1000
            }
        });

        return {
            context,
            x: 0,
            y: 0,
            width: args.size.width,
            height: args.size.height
        };
    }

    /**
     * プリンターテストリクエスト作成
     */
    public async createPrinterTestRequest() {
        let request = '';
        const printImage = await this.createPrintTestImage({
            size: { width: 560, height: 730 }
        });
        // canvas確認
        // await this.createPrintTestImageToCanvas({
        //     size: { width: 560, height: 730 }
        // });
        // return;
        request = this.builder.createBitImageElement(printImage);
        // 紙を切断
        request += this.builder.createCutPaperElement({ feed: true, type: 'partial' });

        return [request];
    }

    /**
     * プリンターリクエストリスト作成
     */
    public async createPrinterRequestList(args: {
        order: factory.order.IOrder;
    }) {
        const orderNumber = args.order.orderNumber;
        const customer = {
            // email: args.order.customer.email,
            telephone: args.order.customer.telephone
        };
        await this.cinerino.getServices();
        const order = await this.cinerino.order.authorizeOwnershipInfos({ orderNumber, customer });
        const printerRequests = [];
        for (let i = 0; i < args.order.acceptedOffers.length; i++) {
            const printerRequest = await this.createPrinterRequest({ order, offerIndex: i });
            printerRequests.push(printerRequest);
        }

        return printerRequests;
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

    private async draw(args: {
        canvas: HTMLCanvasElement,
        size: { width: number; height: number; },
        data: {
            confirmationNumber: number;
            theaterName: string;
            screenName: string;
            eventName: string;
            startDate: string;
            seatNumber: string;
            ticketName: string;
            price: number;
        }
    }) {
        const canvas = args.canvas;
        const data = args.data;
        canvas.width = args.size.width;
        canvas.height = args.size.height;
        const context = canvas.getContext('2d');
        if (context === null) {
            throw new Error('context is null');
        }
        const drawImage = (drawImageArgs: {
            image: HTMLImageElement;
            x: number;
            y: number;
            width: number;
            height: number;
        }) => {
            return new Promise((resolve) => {
                drawImageArgs.image.onload = () => {
                    context.drawImage(
                        drawImageArgs.image,
                        drawImageArgs.x,
                        drawImageArgs.y,
                        drawImageArgs.width,
                        drawImageArgs.height
                    );
                    resolve();
                };
            });
        };
        const left = 0;
        const right = canvas.width;
        const bottom = args.size.height;
        const center = canvas.width / 2;
        const font = `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "游ゴシック  Medium", meiryo, sans-serif`;
        // ロゴ
        const logoImage = new Image();
        logoImage.src = '/assets/images/logo.svg';
        await drawImage({ image: logoImage, x: (canvas.width / 2) - 100, y: 5, width: 40, height: 40 });

        // 劇場
        context.fillStyle = 'black';
        context.font = `bold 34px ${font}`;
        context.textAlign = 'left';
        context.fillText(data.theaterName, (canvas.width / 2) - (100 - 35 - 15), 35);
        // 鑑賞日時
        context.font = `normal 40px ${font}`;
        context.textAlign = 'center';
        context.fillText(`${data.startDate}～`, center, 110);
        context.strokeStyle = '#000';
        // 作品名
        context.font = `bold 40px ${font}`;
        const title = data.eventName;
        const titleLimit = 18;
        if (title.length > titleLimit) {
            context.fillText(title.slice(0, titleLimit), center, 180);
            context.fillText(title.slice(titleLimit, title.length), center, 230);
        } else {
            context.fillText(title, center, 180);
        }
        // 背景
        const boxImage = new Image();
        boxImage.src = '/assets/images/print_box.svg';
        await drawImage({ image: boxImage, x: 0, y: 270, width: canvas.width, height: 210 });
        // スクリーン
        context.beginPath();
        context.font = `bold 40px ${font}`;
        context.fillText(data.screenName, center, 340);
        // 座席
        context.beginPath();
        context.fillText(data.seatNumber, center, 440);
        // 券種
        context.textAlign = 'left';
        context.font = `normal 40px ${font}`;
        context.fillText(data.ticketName.slice(0, 8), 0, 540);
        // 金額
        context.textAlign = 'right';
        context.fillText('￥' + data.price.toLocaleString(), right, 540);
        // QR
        const qrcodeCanvas = document.createElement('canvas');
        await qrcode.toCanvas(qrcodeCanvas, 'QRコード文字列');
        context.drawImage(qrcodeCanvas, (canvas.width - 170), (bottom - 170), 170, 170);
        // 説明
        context.textAlign = 'left';
        context.font = `normal 22px ${font}`;
        context.fillText('■ 上記日時1回限り有効', left, bottom - 140);
        context.fillText('■ 変更、払戻不可', left, bottom - 110);
        // 購入番号
        context.font = `normal 22px ${font}`;
        context.fillText(`購入番号 ${data.confirmationNumber}`, left, bottom - 60);
        // 端末
        context.fillText(`端末 TEST`, left, bottom - 30);
        // 発券時間
        const date = moment().format('YYYY/MM/DD HH:mm');
        context.fillText(`(${date} 発券)`, left, bottom);

        return context;
    }
}
