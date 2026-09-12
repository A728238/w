// boot.js - スレッド判定強化＆ファイルマウントバグ完全修正版
(async () => {
    console.log("Web EXE ランナーをローカル展開中（即時自動起動）...");
    
    const baseUrl = "https://github.io";
    
    // 【修正】4コア以上かつ、about:blankでも可能なマルチスレッド判定の最適化
    const cpuCores = navigator.hardwareConcurrency || 1;
    let targetDir = "SingleThreaded";
    let modeText = "シングルスレッド（安全・低スペックモード）";

    // 4コア以上のPCであれば、SharedArrayBufferの有無に関わらずMultiThreadedを強制試行
    if (cpuCores >= 4) {
        targetDir = "MultiThreaded";
        modeText = `マルチスレッド（高速モード: ${cpuCores}コア検知）`;
    }

    // 1. about:blank の画面（DOM）を再構築
    document.open();
    document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Web EXE Runner (Native Boot)</title>
            <link rel="stylesheet" href="${baseUrl}${targetDir}/boxedwine.css">
            <style>
                body { font-family: sans-serif; background: #f0f2f5; padding: 20px; text-align: center; }
                #drop-zone { width: 80%; max-width: 600px; height: 120px; border: 3px dashed #4a90e2; background: #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; cursor: pointer; margin: 20px auto; font-weight: bold; color: #4a90e2; }
                #canvas-container { display: none; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin: 0 auto; }
                #status { font-weight: bold; color: #e67e22; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Web EXE ランナー (ネイティブ起動版)</h1>
            <div id="mode-info">動作モード: ${modeText}</div>
            <div id="status">Wasmカーネルを読み込み中...</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
        </html>
    `);
    document.close();

    // 2. Boxedwineグローバル設定の完全修正
    window.Module = {
        canvas: document.getElementById('canvas'),
        arguments: ['/home/wineuser/app.exe'], // 事前に実行引数を固定定義
        locateFile: function(path) {
            return `${baseUrl}${targetDir}/${path}`;
        },
        // 【修正】Emscriptenが外部の boxedwine.zip を正常にフェッチできるようにパスを指定
        preRun: [function() {
            window.Module.FS_createPreloadedFile("/", "boxedwine.zip", `${baseUrl}${targetDir}/boxedwine.zip`, true, false);
        }],
        onRuntimeInitialized: function() {
            document.getElementById('status').innerText = "準備完了！.exeファイルを読み込んでください。";
        },
        print: console.log,
        printErr: console.error
    };

    // 3. ドラッグ＆ドロップイベントのバグ修正
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0]; // 【修正】[0]のインデックス抜けを修復
            if (!file.name.endsWith('.exe')) {
                alert('Windowsの実行ファイル (.exe) を選択してください。');
                return;
            }

            document.getElementById('status').innerText = `${file.name} を解析中（爆速ネイティブ実行）...`;
            dropZone.style.display = 'none';
            document.getElementById('canvas-container').style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(evt) {
                const uint8Array = new Uint8Array(evt.target.result);
                
                // Wasmの仮想ファイルシステムへの書き込みと実行
                if (typeof FS !== 'undefined') {
                    try {
                        // 実行ディレクトリを掘って格納
                        FS.mkdirTree('/home/wineuser');
                    } catch(err) {}
                    
                    FS.writeFile('/home/wineuser/app.exe', uint8Array);
                    document.getElementById('status').innerText = "実行中...";
                    
                    // Boxedwineのメイン関数を呼び出して.exeをキック
                    if (typeof window.Module.callMain !== 'undefined') {
                        window.Module.callMain(['/home/wineuser/app.exe']);
                    }
                } else {
                    alert("Wasmシステムの初期化が完了していません。画面が「準備完了！」になってからドロップしてください。");
                    location.reload();
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 4. 判定されたディレクトリのコアJSをロード
    const script = document.createElement('script');
    script.src = `${baseUrl}${targetDir}/boxedwine.js`;
    script.async = true;
    document.body.appendChild(script);
})();
