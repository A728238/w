(async () => {
    console.log("Web EXE ランナーをローカル展開中（最終決定版）...");
    
    const protocol = "https:";
    const domain = "a728238.github.io";
    const path = "w";
    const baseUrl = protocol + "//" + domain + "/" + path + "/";
    
    const targetDir = "SingleThreaded";
    const modeText = "シングルスレッド（安全・完全自己完結モード）";

    // 1. 元サイトのCSSを遮断し、画面をクリーンなUIにリセット
    document.documentElement.innerHTML = `
        <head>
            <meta charset="UTF-8">
            <title>Web EXE Runner (Native Boot)</title>
            <link rel="stylesheet" href="${baseUrl}${targetDir}/boxedwine.css">
            <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f0f2f5 !important; font-family: sans-serif !important; }
                body { display: flex; flex-direction: column; align-items: center; padding: 20px; box-sizing: border-box; }
                h1 { color: #333; margin-top: 10px; }
                #mode-info { color: #7f8c8d; font-size: 13px; margin-bottom: 10px; }
                #status { font-weight: bold; color: #e67e22; margin-bottom: 20px; }
                #drop-zone { width: 80%; max-width: 600px; height: 150px; border: 3px dashed #4a90e2; background: #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-weight: bold; color: #4a90e2; box-sizing: border-box; }
                #canvas-container { display: none; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                canvas { display: block; border: none; }
            </style>
        </head>
        <body>
            <h1>Web EXE ランナー (ネイティブ起動版)</h1>
            <div id="mode-info">動作モード: ${modeText}</div>
            <div id="status">【スタンバイ完了】下にWindowsアプリ (.exe) をドロップしてください。</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
    `;

    // 2. ドラッグ＆ドロップイベントの実装
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0]; // 最初のファイルを確実に取得
            if (!file.name.endsWith('.exe')) {
                alert('Windowsの実行ファイル (.exe) を選択してください。');
                return;
            }

            document.getElementById('status').innerText = `${file.name} をシステムへマウント中...`;
            dropZone.style.display = 'none';
            document.getElementById('canvas-container').style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(evt) {
                const exeUint8Array = new Uint8Array(evt.target.result);
                console.log("ユーザーバイナリのメモリロード成功");

                // 3. 余計な関数を排除し、シンプルな起動設定のみを Module にセット
                window.Module = {
                    canvas: document.getElementById('canvas'),
                    arguments: ['/home/wineuser/app.exe'], // 実行対象
                    locateFile: function(filePath) {
                        return baseUrl + targetDir + "/" + filePath;
                    },
                    preRun: [function() {
                        if (typeof FS !== 'undefined') {
                            try {
                                FS.mkdirTree('/home/wineuser');
                                FS.writeFile('/home/wineuser/app.exe', exeUint8Array);
                                console.log("ユーザーバイナリのマウント成功");
                            } catch(e) {
                                console.error("FSマウントエラー:", e);
                            }
                        }
                    }],
                    onRuntimeInitialized: function() {
                        document.getElementById('status').innerText = "アプリケーションが正常に起動しました！";
                    },
                    print: console.log,
                    printErr: console.error
                };

                // 4. コアJSをロード（直接修正が加えられた最新のjs）
                document.getElementById('status').innerText = "Wasmカーネルをキック中（爆速ネイティブ実行）...";
                const script = document.createElement('script');
                script.src = baseUrl + targetDir + "/boxedwine.js?v=" + Date.now();
                script.async = true;
                document.body.appendChild(script);
            };
            reader.readAsArrayBuffer(file);
        }
    });
})();
