// tslint:disable:max-line-length

export function getPurchaseCompleteTemplate(args: {
    eventStartDate: string;
    eventEndDate: string;
    workPerformedName: string;
    screenName: string;
    screenAddress: string;
    reservedSeats: string;
    inquiryUrl: string;
}) {
    return `
| #{order.customer.familyName} #{order.customer.givenName} 様
| この度は、#{order.seller.name}のオンラインチケットサービスにてご購入頂き、誠にありがとうございます。お客様がご購入されましたチケットの情報は下記の通りです。
|
| [予約番号]
| #{order.confirmationNumber}
|
| [注文日時]
| #{order.orderDate}
|
| [上映日時]
| ${args.eventStartDate} - ${args.eventEndDate}
|
| [作品名]
| ${args.workPerformedName}
|
| [スクリーン名]
| ${args.screenName} ${args.screenAddress}
|
| [座席]
| ${args.reservedSeats}
|
| [合計]
| ￥#{order.price}
|
| 【チケットの発券とご入場について】
|  (スマート入場のお客様)
| 以下のURLよりチケット情報確認照会画面へアクセスして頂き、「予約番号」「お電話番号」を入力のうえ照会ボタンを押してください。
| ${args.inquiryUrl}?confirmationNumber=#{order.confirmationNumber}
| ご鑑賞時間の24時間前から入場用QRコードが表示されますので、直接劇場受付へご提示のうえご入場ください。
| (ＰＣでご購入のお客様)
| ＰＣで上記スマート入場と同様の操作していただきますと入場用ＱＲコードが表示されますので、プリントアウトしたものを直接劇場受付へご提示のうえご入場ください。
| なお、プリントアウトができない場合は、各劇場受付にて上記の「予約番号」「お電話番号」をお伝えいただきますと入場用QRコード付きの紙チケットを発券いたします。
|
| [注意事項]
| １　ご購入いただいたチケットは、上映中止・もしくは上映延期とならない限り、交通渋滞・電車遅延などいかなる理由があっても、チケットのキャンセル・変更・払い戻しは一切致しません。また払い戻し実施の際はチケット券面金額のみが払戻し対象であり、その他の費用(交通費等付随して発生した費用)に関してはお支払いいたしかねます。
| ２　学生割引・シニア割引等の割引チケットを購入された方は、ご入場時にチケットと一緒に、以下の証明書をご提示いただきます。
| ・学生の方は、学校長発行の学生証または学生手帳
| ・シニア・夫婦５０割引の方は、生年月日が確認できる公的機関発行の証明書
| ・ハンデキャップの方は、障がい者手帳
| ご提示いただけない場合は、一般料金との差額をいただく場合があります。
| ３　東京都青少年の健全な育成に関する条例の定めにより、終映が23：00を過ぎる上映回は18歳未満及び高校生の方のご入場をお断りいたします。保護者同伴でもご入場いただけません。
|
|
| なお、このメールは、渋谷TOEIの予約システムでチケットをご購入頂いた方にお送りしておりますが、
| チケット購入に覚えのない方に届いている場合は、お手数ですが下記のお問い合わせ先までご連絡ください。
| ※このメールアドレスは送信専用となっておりますので、ご返信頂けません。
| ご不明な点がございましたら、下記番号までお問合わせください。
| お問い合わせはこちら
| #{order.seller.name}
| TEL：#{order.seller.telephone}
    `;
}
