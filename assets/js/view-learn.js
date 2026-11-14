(function () {
  'use strict';
  var H = UI.esc;

  var WORDS = [
    ['computer', '/kəmˈpjuːtə(r)/', 'n.', '计算机', 'I use a computer to finish my homework.', '我用计算机完成作业。'],
    ['keyboard', '/ˈkiːbɔːd/', 'n.', '键盘', 'Type the password on the keyboard.', '用键盘输入密码。'],
    ['printer', '/ˈprɪntə(r)/', 'n.', '打印机', 'The printer is out of paper.', '打印机没纸了。'],
    ['software', '/ˈsɒftweə(r)/', 'n.', '软件', 'This software can edit pictures.', '这个软件可以编辑图片。'],
    ['hardware', '/ˈhɑːdweə(r)/', 'n.', '硬件', 'The keyboard is a piece of hardware.', '键盘是一种硬件。'],
    ['network', '/ˈnetwɜːk/', 'n.', '网络', 'The school network is very fast.', '学校的网络很快。'],
    ['database', '/ˈdeɪtəbeɪs/', 'n.', '数据库', 'Student information is stored in a database.', '学生信息存放在数据库里。'],
    ['program', '/ˈprəʊɡræm/', 'n.', '程序', 'He wrote a small program to sort numbers.', '他写了一个给数字排序的小程序。'],
    ['file', '/faɪl/', 'n.', '文件', 'Please send me the file by email.', '请把文件用邮件发给我。'],
    ['folder', '/ˈfəʊldə(r)/', 'n.', '文件夹', 'Put the pictures in the new folder.', '把图片放进新文件夹。'],
    ['password', '/ˈpɑːswɜːd/', 'n.', '密码', 'Never tell others your password.', '不要告诉别人你的密码。'],
    ['screen', '/skriːn/', 'n.', '屏幕', 'The words on the screen are too small.', '屏幕上的字太小了。'],
    ['mouse', '/maʊs/', 'n.', '鼠标', 'Click the left button of the mouse.', '点击鼠标左键。'],
    ['website', '/ˈwebsaɪt/', 'n.', '网站', 'This website helps students learn English.', '这个网站帮助学生学习英语。'],
    ['email', '/ˈiːmeɪl/', 'n.', '电子邮件', 'I check my email every morning.', '我每天早上查看电子邮件。'],
    ['download', '/ˌdaʊnˈləʊd/', 'v.', '下载', 'You can download the file for free.', '你可以免费下载这个文件。'],
    ['upload', '/ˌʌpˈləʊd/', 'v.', '上传', 'Upload your homework before Friday.', '周五前上传你的作业。'],
    ['save', '/seɪv/', 'v.', '保存', 'Remember to save the document.', '记得保存文档。'],
    ['delete', '/dɪˈliːt/', 'v.', '删除', 'Do not delete the system files.', '不要删除系统文件。'],
    ['install', '/ɪnˈstɔːl/', 'v.', '安装', 'It takes ten minutes to install the program.', '安装这个程序需要十分钟。'],
    ['update', '/ˌʌpˈdeɪt/', 'v.', '更新', 'Update the software to keep it safe.', '更新软件以保证安全。'],
    ['virus', '/ˈvaɪrəs/', 'n.', '病毒', 'A virus may damage your computer.', '病毒可能损坏你的电脑。'],
    ['firewall', '/ˈfaɪəwɔːl/', 'n.', '防火墙', 'The firewall blocks dangerous websites.', '防火墙拦截危险网站。'],
    ['server', '/ˈsɜːvə(r)/', 'n.', '服务器', 'The server is down this morning.', '今天早上服务器宕机了。'],
    ['browser', '/ˈbraʊzə(r)/', 'n.', '浏览器', 'Open the browser and search for the answer.', '打开浏览器搜索答案。'],
    ['account', '/əˈkaʊnt/', 'n.', '账户', 'I forgot the password of my account.', '我忘了账户密码。'],
    ['search', '/sɜːtʃ/', 'v.', '搜索', 'Search the Internet for more information.', '上网搜索更多信息。'],
    ['backup', '/ˈbækʌp/', 'n.', '备份', 'Make a backup of your files every week.', '每周给文件做一次备份。'],
    ['memory', '/ˈmeməri/', 'n.', '内存；记忆', 'This computer has 16 GB of memory.', '这台电脑有 16GB 内存。'],
    ['monitor', '/ˈmɒnɪtə(r)/', 'n.', '显示器', 'The monitor is bigger than the screen of my phone.', '显示器比我手机屏幕大。'],
    ['wireless', '/ˈwaɪələs/', 'adj.', '无线的', 'The classroom has a wireless network.', '教室里有无线网络。'],
    ['security', '/sɪˈkjʊərəti/', 'n.', '安全', 'Information security is very important.', '信息安全非常重要。'],
    ['data', '/ˈdeɪtə/', 'n.', '数据', 'The data shows that more students like online study.', '数据显示更多学生喜欢在线学习。'],
    ['error', '/ˈerə(r)/', 'n.', '错误', 'The program stopped because of an error.', '程序因错误而停止。'],
    ['format', '/ˈfɔːmæt/', 'n./v.', '格式；格式化', 'Format the disk before you use it.', '使用前先格式化磁盘。'],
    ['print', '/prɪnt/', 'v.', '打印', 'Print two copies of the report.', '把报告打印两份。'],
    ['copy', '/ˈkɒpi/', 'v.', '复制', 'Copy the sentence into your notebook.', '把这句话复制到笔记本里。'],
    ['paste', '/peɪst/', 'v.', '粘贴', 'Copy the text and paste it here.', '复制文本并粘贴到这里。'],
    ['shared', '/ʃeəd/', 'adj.', '共享的', 'We keep the files in a shared folder.', '我们把文件放在共享文件夹里。'],
    ['remote', '/rɪˈməʊt/', 'adj.', '远程的', 'He fixed the computer by remote control.', '他通过远程控制修好了电脑。'],
    ['digital', '/ˈdɪdʒɪtl/', 'adj.', '数字的', 'We live in a digital age.', '我们生活在数字时代。'],
    ['system', '/ˈsɪstəm/', 'n.', '系统', 'The operating system needs an update.', '操作系统需要更新。'],
    ['device', '/dɪˈvaɪs/', 'n.', '设备', 'A USB disk is a storage device.', 'U 盘是一种存储设备。'],
    ['application', '/ˌæplɪˈkeɪʃn/', 'n.', '应用程序', 'This application can translate sentences.', '这个应用程序能翻译句子。'],
    ['information', '/ˌɪnfəˈmeɪʃn/', 'n.', '信息', 'Please give me more information about the course.', '请给我更多关于课程的信息。'],
    ['technology', '/tekˈnɒlədʒi/', 'n.', '技术', 'Technology changes our life.', '技术改变我们的生活。'],
    ['internet', '/ˈɪntənet/', 'n.', '互联网', 'The Internet connects computers around the world.', '互联网把世界各地的计算机连接起来。'],
    ['message', '/ˈmesɪdʒ/', 'n.', '消息', 'I left a message on his phone.', '我在他手机上留了条消息。'],
    ['document', '/ˈdɒkjumənt/', 'n.', '文档', 'Save the document as a PDF file.', '把文档保存为 PDF 文件。'],
    ['service', '/ˈsɜːvɪs/', 'n.', '服务', 'The website offers a free translation service.', '这个网站提供免费翻译服务。']
  ].map(function (a) {
    return { w: a[0], ipa: a[1], pos: a[2], cn: a[3], ex: a[4], exCn: a[5] };
  });

  var GRAMMAR = [
    { n: '一般现在时', f: '主语 + 动词原形 / 动词 -s(-es)', d: '表示经常性、习惯性的动作或客观事实；主语为第三人称单数时，动词加 -s 或 -es。', e: 'He works in a computer company. 他在一家电脑公司工作。' },
    { n: '一般过去时', f: '主语 + 动词过去式', d: '表示过去某个时间发生的动作或存在的状态，规则动词加 -ed。', e: 'I finished my homework yesterday. 我昨天完成了作业。' },
    { n: '现在完成时', f: 'have / has + 过去分词', d: '表示已经完成、并对现在有影响的动作，常与 already、yet、since 连用。', e: 'I have learned 500 English words. 我已经学了 500 个英语单词。' },
    { n: '一般将来时', f: 'will + 动词原形 / be going to + 动词原形', d: '表示将来要发生的动作或计划。', e: 'We will have an exam next week. 我们下周有考试。' },
    { n: '被动语态', f: 'be + 过去分词', d: '表示主语是动作的承受者，动作执行者可用 by 引出。', e: 'The file was deleted by mistake. 文件被误删了。' },
    { n: '定语从句', f: '名词 + who / which / that + 从句', d: '用来修饰前面的名词；指人常用 who，指物常用 which 或 that。', e: 'The man who fixed my computer is my uncle. 修好我电脑的人是我叔叔。' },
    { n: '宾语从句', f: '主句 + that / if / 疑问词 + 陈述语序', d: '在句中作宾语，从句必须使用陈述语序，不能用疑问语序。', e: 'I don\'t know where he lives. 我不知道他住在哪里。' },
    { n: '情态动词 must', f: 'must / mustn\'t + 动词原形', d: 'must 表示「必须」，mustn\'t 表示「禁止」，两者意思完全不同。', e: 'You must finish it today. 你今天必须完成它。' }
  ];

  function learn() {
    var s = DB.get();
    if (!s.learn || typeof s.learn !== 'object') s.learn = { words: {}, grammar: {} };
    if (!s.learn.words) s.learn.words = {};
    return s.learn;
  }
  function wordRec(w) {
    var L = learn();
    return L.words[w] || (L.words[w] = { n: 0, ok: 0, last: '' });
  }
  function masteredCount() {
    var L = learn();
    return WORDS.filter(function (x) { return (L.words[x.w] || {}).ok >= 2; }).length;
  }
  function grammarAcc() {
    var rows = DB.chapterStats('yingyu');
    var row = rows.filter(function (r) { return r.name === '语法基础'; })[0];
    return row && row.n ? { acc: row.acc, n: row.n } : null;
  }

  function speakWord(w) {
    UI.speak(w.w + '。' + w.cn + '。' + w.ex, DB.prefs().rate);
  }

  // ---------------- 单词记忆 ----------------
  function renderWords(root) {
    var L = learn();
    var fresh = WORDS.filter(function (x) { return (L.words[x.w] || {}).ok < 2; });
    var queue = UI.shuffle(fresh).slice(0, 12);
    if (!queue.length) queue = UI.shuffle(WORDS).slice(0, 12);
    var pos = 0, revealed = false, roundOk = 0, roundSeen = 0;

    function paint() {
      if (pos >= queue.length) { finish(); return; }
      var w = queue[pos];
      var rec = wordRec(w.w);
      var mastered = masteredCount();

      root.innerHTML = '<div class="page-head"><div><h2>互动学习</h2>' +
        '<p>单词记忆 + 语法练习。单词卡先回想、再翻释义，认识的词连续两次就记为掌握。</p></div>' +
        '<div class="seg"><a href="#/learn" class="is-on">单词记忆</a><a href="#/learn?tab=grammar">语法练习</a></div></div>' +
        '<div class="grid-2"><div class="card word-card">' +
        '<div class="word-card__meta"><span class="chip chip--jade">计算机与办公高频词</span>' +
        '<span class="chip">第 ' + (pos + 1) + ' / ' + queue.length + ' 个</span>' +
        '<span class="spacer"></span><span class="small muted">已掌握 ' + mastered + ' / ' + WORDS.length + '</span></div>' +
        '<div class="word-card__word">' + H(w.w) +
        '<button class="icon-btn" id="speakBtn" aria-label="朗读">' + UI.icon('sound') + '</button></div>' +
        '<div class="word-card__ipa">' + H(w.ipa) + ' <span class="muted">' + H(w.pos) + '</span></div>' +
        (revealed
          ? '<div class="word-card__cn">' + H(w.cn) + '</div>' +
            '<div class="word-card__ex"><p>' + H(w.ex) + '</p><span>' + H(w.exCn) + '</span></div>'
          : '<button class="btn btn--outline btn--block" id="revealBtn" style="margin-top:18px">显示释义</button>') +
        '<div class="word-card__bar"><i style="width:' + Math.round(pos / queue.length * 100) + '%"></i></div>' +
        '<div class="row" style="margin-top:14px">' +
        (revealed
          ? '<button class="btn btn--primary" id="knowBtn" style="flex:1">认识，下一张</button>' +
            '<button class="btn btn--outline" id="againBtn" style="flex:1">不熟，稍后再看</button>'
          : '<button class="btn btn--quiet btn--sm" id="againBtn">跳过</button><span class="spacer"></span>' +
            '<span class="small muted">先在心里说出它的意思</span>') +
        '</div></div>' +
        '<div class="stack"><div class="card"><div class="card__head"><h3 class="card__title">本轮进度</h3></div>' +
        '<div class="stat-line"><span>本组单词</span><b>' + queue.length + ' 个</b></div>' +
        '<div class="stat-line"><span>本组已认识</span><b>' + roundOk + ' 个</b></div>' +
        '<div class="stat-line"><span>本组已过</span><b>' + roundSeen + ' 个</b></div>' +
        '<div class="stat-line"><span>累计掌握</span><b>' + mastered + ' / ' + WORDS.length + '</b></div>' +
        '<p class="small muted" style="margin-top:12px">连续两次点「认识」，该词才记为掌握，之后不再进入新词组。</p></div>' +
        '<div class="card"><div class="card__head"><h3 class="card__title">这个词出现过</h3></div>' +
        '<div class="stat-line"><span>学习次数</span><b>' + rec.n + ' 次</b></div>' +
        '<div class="stat-line"><span>认识次数</span><b>' + rec.ok + ' 次</b></div>' +
        '<div class="stat-line"><span>最近学习</span><b>' + (rec.last || '—') + '</b></div></div></div></div>';

      UI.el('speakBtn').onclick = function () { speakWord(w); };
      var rv = UI.el('revealBtn');
      if (rv) rv.onclick = function () { revealed = true; paint(); };
      UI.el('knowBtn') && (UI.el('knowBtn').onclick = function () {
        var r = wordRec(w.w);
        r.n++; r.ok++; r.last = DB.today();
        DB.save();
        roundOk++; roundSeen++;
        revealed = false; pos++;
        paint();
      });
      UI.el('againBtn').onclick = function () {
        var r = wordRec(w.w);
        r.n++; r.last = DB.today();
        DB.save();
        roundSeen++;
        queue.push(w);
        revealed = false;
        pos++;
        paint();
      };
    }

    function finish() {
      root.innerHTML = '<div class="page-head"><div><h2>互动学习</h2>' +
        '<p>单词记忆 + 语法练习。</p></div>' +
        '<div class="seg"><a href="#/learn" class="is-on">单词记忆</a><a href="#/learn?tab=grammar">语法练习</a></div></div>' +
        '<div class="card" style="text-align:center;padding:30px">' +
        '<div style="display:flex;justify-content:center;margin-bottom:12px">' +
        UI.ring(queue.length ? Math.round(roundOk / queue.length * 100) : 100, roundOk + '/' + queue.length, '本组认识') + '</div>' +
        '<h2 style="font-family:var(--ff-serif);font-size:20px">本组单词过完了</h2>' +
        '<p class="small muted" style="margin-top:4px">累计掌握 ' + masteredCount() + ' / ' + WORDS.length + ' 个 · 没记住的词会留在下一组</p>' +
        '<div class="row" style="justify-content:center;margin-top:18px">' +
        '<a class="btn btn--primary" href="#/learn">再来一组</a>' +
        '<a class="btn btn--outline" href="#/learn?tab=grammar">去练语法</a>' +
        '<a class="btn btn--outline" href="#/home">回首页</a></div></div>';
    }

    paint();
  }

  // ---------------- 语法练习 ----------------
  function renderGrammar(root) {
    var ga = grammarAcc();
    var list = Bank.query({ subject: 'yingyu', chapter: '语法基础' });
    var practice = Bank.query({ subject: 'yingyu', chapter: '固定搭配' });
    var cards = GRAMMAR.map(function (g) {
      return '<div class="card grammar-card"><div class="card__head"><h3 class="card__title">' + H(g.n) + '</h3>' +
        '<span class="chip chip--blue">句型</span></div>' +
        '<code class="grammar-card__f">' + H(g.f) + '</code>' +
        '<p>' + H(g.d) + '</p><p class="grammar-card__e">' + H(g.e) + '</p></div>';
    }).join('');

    root.innerHTML = '<div class="page-head"><div><h2>互动学习</h2>' +
      '<p>先看语法卡片，再做专项练习；正确率会同步到知识点地图。</p></div>' +
      '<div class="seg"><a href="#/learn">单词记忆</a><a href="#/learn?tab=grammar" class="is-on">语法练习</a></div></div>' +
      '<div class="grid-3" style="margin-bottom:16px">' +
      '<div class="card card--flat"><div class="small muted">语法基础正确率</div>' +
      '<b class="num" style="font-size:26px">' + (ga ? ga.acc + '%' : '—') + '</b>' +
      '<div class="small muted">' + (ga ? '已作答 ' + ga.n + ' 次' : '还未开始语法专项') + '</div></div>' +
      '<div class="card card--flat"><div class="small muted">语法题库</div><b class="num" style="font-size:26px">' + list.length + '</b>' +
      '<div class="small muted">时态 · 语态 · 从句 · 搭配</div></div>' +
      '<div class="card card--flat"><div class="small muted">固定搭配</div><b class="num" style="font-size:26px">' + practice.length + '</b>' +
      '<div class="small muted">登入、打开、参加等常用短语</div></div></div>' +
      '<div class="row row--wrap" style="margin-bottom:16px">' +
      '<button class="btn btn--primary" id="grammarStart">开始语法专项 · 10 题</button>' +
      '<button class="btn btn--outline" id="phraseStart">固定搭配 · 8 题</button>' +
      '<a class="btn btn--outline" href="#/practice?s=yingyu&ch=' + encodeURIComponent('语法基础') + '&limit=20">更多筛选</a></div>' +
      '<div class="section-title">语法卡片</div>' +
      '<div class="grid-2">' + cards + '</div>';

    function startWith(pool, n) {
      var qs = UI.shuffle(pool.filter(function (q) { return !DB.get().shielded[q.id]; })).slice(0, n);
      if (!qs.length) { UI.toast('这组题都已被屏蔽，可去屏蔽管理恢复'); return; }
      Views._startQuiz(root, qs, { title: '语法练习', mode: 'practice' });
    }
    UI.el('grammarStart').onclick = function () { startWith(list, 10); };
    UI.el('phraseStart').onclick = function () { startWith(practice, 8); };
  }

  function renderLearn(root, p) {
    if (p.q.tab === 'grammar') renderGrammar(root);
    else renderWords(root);
  }

  window.Views = window.Views || {};
  window.Views.learn = { title: '互动学习', render: renderLearn };
})();
