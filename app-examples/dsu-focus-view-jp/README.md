## Docusignユニバーシティフォーカスビューの埋め込み署名の例

### はじめ
HTMLとJavaScriptのスクリプトファイルは、フォーカスビュー機能を使用した埋め込み署名プロセスのレンダリングの最小の例です。 

### 手順の例
1. エンベロープを作成してエンベロープIDを取得します。署名受信者は「組み込み」（埋め込み）署名者**である必要があります**。受信者の`clientUserId`プロパティを設定して、署名者を組み込み署名者にします。
2. EnvelopeViews:createRecipientを呼び出して、受信者ビューのURLを生成します。

   ```
    createRecipientViewRequest = {
            authenticationMethod: "None",
            clientUserId: clientUserId,  // Envelopes:createの呼び出しから
            email: email,                // Envelopes:createの呼び出しから
            userName: name,              // Envelopes:createの呼び出しから
            frameAncestors: FRAME_ANCESTORS, // 署名プロセスページの元の場所
            messageOrigins: ["https://apps-d.docusign.com"],
            returnUrl: returnUrl, // アプリケーションへ
        }
    ```
   レスポンスのURLは`recipientViewUrl`です。
3. Oブラウザーでこの例のindex.htmlを開きます。
4. ページのインスペクタを開きます。
5. ページをリロードします。 

   インスペクタは`debugger`ステートメントで開きます。
6. インスペクタコンソールを使用してJavaScript変数の`recipientViewUrl`と`clientId`を設定します。 
   
   `recipientViewUrl`の値は非常に長いです。
7. 続けてデバッガを実行します。 
   
   エンベロープのフォーカスビュー署名プロセスが開きます。
8. インスペクタコンソールでスクリプトからのメッセージを確認します。