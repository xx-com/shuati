(function () {
  'use strict';
  var H = UI.esc;
  var LETTER = 'ABCDEFGH';

  function availableList(f) {
    var list = Bank.query(f).filter(function (q) { return !DB.get().shielded[q.id]; });
    return list;
  }

  // ---------------- 练习入口（筛选） ----------------
  function render(root, p) {
    if (p.q.qid) {
      var one = Bank.byId(p.q.qid);
      if (!one) {
        root.innerHTML = UI.empty('?', '找不到这道题', '它可能已被删除，请从错题集重新进入。', '<a class="btn btn--outline" href="#/wrong">回错题集</a>');
        return;
      }
      startQuiz(root, [one], { title: (Bank.subject(one.s) || {}).n || '单题重练', mode: p.q.mode === 'review' ? 'review' : 'practice' });
      return;
    }
    var hasDeep = p.q.s || p.q.ch || p.q.type || p.q.kp;
    if (hasDeep) {
      var f = { subject: p.q.s || undefined, chapter: p.q.ch || undefined, type: p.q.type || undefined, kp: p.q.kp || undefined, diff: p.q.diff || undefined };
      var list = availableList(f);
      if (p.q.order !== 'seq') list = UI.shuffle(list);
      var limit = Number(p.q.limit || 20);
      if (list.length > limit) list = list.slice(0, limit);
      if (!list.length) {
        root.innerHTML = UI.empty('空', '这个范围内没有可练的题', '可能已被你全部屏蔽，或筛选条件过窄。',
          '<a class="btn btn--outline" href="#/practice">重新筛选</a>');
        return;
      }
      startQuiz(root, list, { title: (Bank.subject(list[0].s) || {}).n + ' · ' + (list[0].ch || ''), mode: 'practice' });
      return;
    }
    setup(root);
  }

  function setup(root) {
    var subjects = Bank.subjects();
    var st = DB.stats();
    var TYPES = [['', '全部题型'], ['single', '单选'], ['multi', '多选'], ['judge', '判断'], ['blank', '填空'], ['order', '排序']];
    var DIFFS = [['', '全部难度'], ['1', '基础'], ['2', '中等'], ['3', '较难']];
    var LIMITS = [['10', '10 题'], ['20', '20 题'], ['30', '30 题'], ['50', '50 题'], ['9999', '全部']];
    var sel = { subject: subjects[0].k, chapter: '', type: '', diff: '', kp: '', limit: '20' };

    root.innerHTML = '<div class="page-head"><div><h2>练习</h2>' +
      '<p>按 科目 → 章节 → 知识点 下钻；答对自动屏蔽，题单越用越干净。</p></div>' +
      '<div class="row"><a class="btn btn--outline btn--sm" href="#/mine">我的题库</a>' +
      '<a class="btn btn--outline btn--sm" href="#/shielded">已屏蔽 ' + st.shielded + '</a></div></div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">筛选条件</h3>' +
      '<span class="small muted" id="availTip"></span></div>' +
      '<div class="fgroup"><span class="fgroup__label">科目</span><div class="fpills" id="gSub"></div></div>' +
      '<div class="fgroup"><span class="fgroup__label">章节</span><div class="fpills" id="gCh"></div></div>' +
      '<div class="fgroup"><span class="fgroup__label">题型</span><div class="fpills" id="gType"></div></div>' +
      '<div class="fgroup"><span class="fgroup__label">难度</span><div class="fpills" id="gDiff"></div></div>' +
      '<div class="fgroup"><span class="fgroup__label">知识点</span><div class="fpills" id="gKp"></div></div>' +
      '<div class="fgroup"><span class="fgroup__label">题量</span><div class="fpills" id="gLimit"></div></div>' +
      '<div style="margin-top:16px"><button class="btn btn--primary" id="startBtn">开始练习</button></div>' +
      '<div class="row row--wrap" id="chapterQuick" style="gap:8px;margin-top:14px"></div></div>' +
      '<div class="section-title">按模块练习</div>' +
      '<div class="grid-3" id="moduleGrid"></div>' +
      '<div class="section-title">快捷入口</div>' +
      '<div class="grid-3">' +
      '<a class="card card--flat" href="#/review"><b>今日复习</b><p class="small muted">' +
      (st.due ? st.due + ' 道到期' : '暂无到期') + '</p></a>' +
      '<a class="card card--flat" href="#/wrong"><b>错题集</b><p class="small muted">' + st.wrongCount + ' 道错题，重点 ' + st.focus + ' 道</p></a>' +
      '<a class="card card--flat" href="#/mastery"><b>知识点地图</b><p class="small muted">按章节热力定位薄弱点</p></a></div>';

    function pick(hostId, items, cur, onPick) {
      var host = UI.el(hostId);
      host.innerHTML = items.map(function (it) {
        return '<button class="fpill' + (String(it[0]) === String(cur) ? ' is-on' : '') +
          '" data-v="' + H(String(it[0])) + '">' + H(it[1]) +
          (it[2] == null ? '' : '<i>' + it[2] + '</i>') + '</button>';
      }).join('');
      host.onclick = function (e) {
        var b = e.target.closest('.fpill');
        if (b) onPick(b.getAttribute('data-v'));
      };
    }

    function chaptersNow() { return Bank.chaptersOf(sel.subject); }
    function kpsNow() {
      var kps = {};
      chaptersNow().forEach(function (c) {
        if (sel.chapter && c.name !== sel.chapter) return;
        (c.kps || []).forEach(function (k) { kps[k] = 1; });
      });
      return Object.keys(kps);
    }

    function renderSub() {
      pick('gSub', subjects.map(function (s) { return [s.k, s.n, s.count]; }), sel.subject, function (v) {
        sel.subject = v; sel.chapter = ''; sel.kp = '';
        renderSub(); renderCh(); renderKp(); renderQuick(); renderModules(); updateAvail();
      });
    }
    function renderCh() {
      var items = [['', '全部章节']].concat(chaptersNow().map(function (c) { return [c.name, c.name, c.count]; }));
      pick('gCh', items, sel.chapter, function (v) {
        sel.chapter = v; sel.kp = '';
        renderCh(); renderKp(); updateAvail();
      });
    }
    function renderType() { pick('gType', TYPES, sel.type, function (v) { sel.type = v; renderType(); updateAvail(); }); }
    function renderDiff() { pick('gDiff', DIFFS, sel.diff, function (v) { sel.diff = v; renderDiff(); updateAvail(); }); }
    function renderLimit() { pick('gLimit', LIMITS, sel.limit, function (v) { sel.limit = v; renderLimit(); }); }
    function renderKp() {
      var items = [['', '全部知识点']].concat(kpsNow().map(function (k) { return [k, k]; }));
      pick('gKp', items, sel.kp, function (v) { sel.kp = v; renderKp(); updateAvail(); });
    }

    function currentFilter() {
      return {
        subject: sel.subject,
        chapter: sel.chapter || undefined,
        type: sel.type || undefined,
        diff: sel.diff || undefined,
        kp: sel.kp || undefined
      };
    }
    function updateAvail() {
      var n = availableList(currentFilter()).length;
      var all = Bank.query(currentFilter()).length;
      UI.el('availTip').textContent = '当前范围 ' + all + ' 题，已屏蔽 ' + (all - n) + ' 题，可练 ' + n + ' 题';
    }
    function renderQuick() {
      UI.el('chapterQuick').innerHTML = chaptersNow().slice(0, 8).map(function (c) {
        return '<a class="chip" href="#/practice?s=' + sel.subject + '&ch=' + encodeURIComponent(c.name) + '">' +
          H(c.name) + ' · ' + c.count + '</a>';
      }).join('');
    }
    function renderModules() {
      var mods = {};
      chaptersNow().forEach(function (c) { if (c.module) mods[c.module] = (mods[c.module] || 0) + c.count; });
      var keys = Object.keys(mods);
      var host = UI.el('moduleGrid');
      if (!keys.length) {
        host.innerHTML = '<div class="card card--flat small muted">该科目暂未划分模块，可直接用上方章节筛选。</div>';
        return;
      }
      host.innerHTML = keys.map(function (m) {
        return '<a class="card card--flat" href="#/practice?s=' + sel.subject + '&ch=' + encodeURIComponent(m) + '">' +
          '<b>' + H(m) + '</b><p class="small muted">' + mods[m] + ' 题</p></a>';
      }).join('');
    }

    UI.el('startBtn').onclick = function () {
      var f = currentFilter();
      var list = availableList(f);
      if (!list.length) { UI.toast('这个范围里没有可练的题'); return; }
      list = UI.shuffle(list);
      var lim = Number(sel.limit);
      if (list.length > lim) list = list.slice(0, lim);
      startQuiz(root, list, { title: (Bank.subject(f.subject) || {}).n, mode: 'practice' });
    };

    renderSub(); renderCh(); renderType(); renderDiff(); renderKp(); renderLimit();
    renderQuick(); renderModules(); updateAvail();
  }

  // ---------------- 答题引擎 ----------------
  function startQuiz(root, questions, opts) {
    opts = opts || {};
    var idx = 0, okCount = 0, doneCount = 0;
    var results = [];
    var started = Date.now();
    var pending = null;      // 单选/多选/判断/填空 的临时作答
    var answered = false;
    var correctNow = false;
    var orderState = null;
    var lastShield = true;

    function quitConfirm() {
      if (opts.mode === 'exam') return;
      if (doneCount === 0) { location.hash = '#/subjects'; return; }
      UI.confirm('结束本组练习？', '已作答的 ' + doneCount + ' 道题会保留记录，未作答的不受影响。', '结束').then(function (ok) {
        if (ok) finish();
      });
    }

    function paint() {
      var q = questions[idx];
      lastShield = DB.prefs().autoShield !== false;
      answered = false; pending = null; correctNow = false; orderState = null;

      var isFav = !!DB.get().favorites[q.id];
      var head = '<div class="quiz"><div class="quiz__top">' +
        '<button class="icon-btn" data-act="quit" aria-label="退出">' + UI.icon('left') + '</button>' +
        '<div class="quiz__bar"><i style="width:' + Math.round(idx / questions.length * 100) + '%"></i></div>' +
        '<span class="quiz__count">' + (idx + 1) + ' / ' + questions.length + '</span></div>' +
        '<div class="qcard"><div class="qcard__meta">' + UI.typeChip(q) +
        '<span class="chip">' + H(q.kp || '') + '</span>' + UI.srcChip(q) +
        '<span class="chip">难度 ' + (q.d === 1 ? '基础' : q.d === 3 ? '较难' : '中等') + '</span>' +
        '<span class="spacer"></span><span class="small muted">' + H(q.ch || '') + '</span></div>' +
        '<div class="qcard__stem">' + H(q.q).replace(/______/g, '<span class="blank">______</span>') + '</div>' +
        '<div class="qcard__tools">' +
        '<button class="btn btn--quiet btn--sm" data-act="speak">' + UI.icon('sound') + ' 朗读</button>' +
        '<button class="btn btn--quiet btn--sm" data-act="fav">' + UI.icon('star') + (isFav ? ' 已收藏' : ' 收藏') + '</button>' +
        '</div><div id="qbody"></div>' +
        '<label class="shield-line"><input type="checkbox" id="shieldBox"' + (lastShield ? ' checked' : '') + '> ' +
        '屏蔽此题（答对后不再出现在题单里）</label>' +
        '<div id="fb"></div>' +
        '<div class="quiz__foot"><button class="btn btn--outline" data-act="skip">跳过</button>' +
        '<span class="spacer"></span><button class="btn btn--primary" id="mainBtn" disabled>提交</button></div></div></div>';

      root.innerHTML = head;
      var body = UI.el('qbody');
      var mainBtn = UI.el('mainBtn');

      if (q.t === 'single') {
        body.innerHTML = '<div class="opts">' + q.o.map(function (o, i) {
          return '<button class="opt" data-opt="' + i + '"><span class="opt__key">' + LETTER[i] + '</span><span>' + H(o) + '</span></button>';
        }).join('') + '</div>';
        UI.qsa('[data-opt]', body).forEach(function (b) {
          b.onclick = function () {
            if (answered) return;
            pending = Number(b.getAttribute('data-opt'));
            UI.qsa('[data-opt]', body).forEach(function (x) { x.classList.remove('is-pick'); });
            b.classList.add('is-pick');
            mainBtn.disabled = false;
            if (DB.prefs().instant) evaluate();
          };
        });
      } else if (q.t === 'judge') {
        body.innerHTML = '<div class="opts"><button class="opt" data-opt="true"><span class="opt__key">✓</span><span>正确</span></button>' +
          '<button class="opt" data-opt="false"><span class="opt__key">✕</span><span>错误</span></button></div>';
        UI.qsa('[data-opt]', body).forEach(function (b) {
          b.onclick = function () {
            if (answered) return;
            pending = b.getAttribute('data-opt') === 'true';
            UI.qsa('[data-opt]', body).forEach(function (x) { x.classList.remove('is-pick'); });
            b.classList.add('is-pick');
            mainBtn.disabled = false;
            if (DB.prefs().instant) evaluate();
          };
        });
      } else if (q.t === 'multi') {
        pending = [];
        body.innerHTML = '<div class="opts">' + q.o.map(function (o, i) {
          return '<button class="opt" data-opt="' + i + '"><span class="opt__key">' + LETTER[i] + '</span><span>' + H(o) + '</span></button>';
        }).join('') + '</div><p class="small muted" style="margin-top:8px">多选题：可选择多个选项</p>';
        UI.qsa('[data-opt]', body).forEach(function (b) {
          b.onclick = function () {
            if (answered) return;
            var i = Number(b.getAttribute('data-opt'));
            var at = pending.indexOf(i);
            if (at >= 0) { pending.splice(at, 1); b.classList.remove('is-pick'); }
            else { pending.push(i); b.classList.add('is-pick'); }
            mainBtn.disabled = pending.length === 0;
          };
        });
      } else if (q.t === 'blank') {
        body.innerHTML = '<div class="fill"><input id="blankInput" type="text" placeholder="输入答案后按 Enter 或点击提交" autocomplete="off"></div>';
        var inp = UI.el('blankInput');
        inp.oninput = function () { mainBtn.disabled = !inp.value.trim(); };
        inp.onkeydown = function (e) { if (e.key === 'Enter' && inp.value.trim()) evaluate(); };
        setTimeout(function () { inp.focus(); }, 60);
      } else if (q.t === 'order') {
        orderState = UI.shuffle(q.o.map(function (_, i) { return i; }));
        body.innerHTML = '<div class="order-list">' + orderState.map(function (oi, pos) {
          return '<div class="order-item"><span class="order-item__no">' + (pos + 1) + '</span>' +
            '<span class="order-item__text">' + H(q.o[oi]) + '</span>' +
            '<span class="order-item__btns"><button data-move="up" data-pos="' + pos + '"' + (pos === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button data-move="down" data-pos="' + pos + '"' + (pos === orderState.length - 1 ? ' disabled' : '') + '>↓</button></span></div>';
        }).join('') + '</div><p class="small muted" style="margin-top:8px">用 ↑ ↓ 调整步骤顺序，再提交。</p>';
        UI.qsa('[data-move]', body).forEach(function (b) {
          b.onclick = function () {
            if (answered) return;
            var pos = Number(b.getAttribute('data-pos'));
            var dir = b.getAttribute('data-move') === 'up' ? -1 : 1;
            var t = orderState[pos]; orderState[pos] = orderState[pos + dir]; orderState[pos + dir] = t;
            var keepAnswered = answered;
            answered = keepAnswered;
            repaintOrder(body, q);
            mainBtn.disabled = false;
          };
        });
        mainBtn.disabled = false;
      }

      mainBtn.onclick = function () {
        if (answered) next();
        else evaluate();
      };
      UI.el('shieldBox').onchange = function () { lastShield = this.checked; };
      UI.qsa('[data-act]', root).forEach(function (b) {
        b.onclick = function () {
          var act = b.getAttribute('data-act');
          if (act === 'quit') quitConfirm();
          if (act === 'speak') UI.speak(q.q + '。' + (q.o ? q.o.join('，') : ''), DB.prefs().rate);
          if (act === 'fav') {
            var on = DB.toggleFav(q.id);
            UI.toast(on ? '已加入收藏' : '已取消收藏');
            b.innerHTML = UI.icon('star') + (on ? ' 已收藏' : ' 收藏');
          }
          if (act === 'skip') next();
        };
      });
    }

    function repaintOrder(body, q) {
      UI.qsa('.order-item', body).forEach(function (row, pos) {
        row.querySelector('.order-item__no').textContent = pos + 1;
        row.querySelector('.order-item__text').textContent = q.o[orderState[pos]];
        var btns = row.querySelectorAll('button');
        btns[0].setAttribute('data-pos', pos);
        btns[1].setAttribute('data-pos', pos);
        btns[0].disabled = pos === 0;
        btns[1].disabled = pos === orderState.length - 1;
      });
    }

    function evaluate() {
      if (answered) return;
      var q = questions[idx];
      if (q.t === 'order') pending = orderState.slice();
      if (q.t === 'blank') {
        var binp = UI.el('blankInput');
        pending = binp && binp.value.trim() ? binp.value.trim() : null;
      }
      if (pending == null) return;
      answered = true;
      correctNow = Bank.check(q, pending);
      if (correctNow) okCount++;
      doneCount++;

      var fb = UI.el('fb');
      var info = '';
      if (!correctNow) info = '已加入复习队列 · 明天起按 1/2/4/7/15/30 天排期';
      else if (lastShield) info = '已屏蔽，不再出现在题单里';
      else info = '保持题单保留';

      fb.innerHTML = '<div class="feedback ' + (correctNow ? 'feedback--ok' : 'feedback--no') + '">' +
        '<b>' + (correctNow ? '回答正确' : '回答错误') + '</b> · ' + H(info) +
        '<span class="feedback__ans">正确答案：' + H(Bank.answerText(q)) + '</span>' +
        (q.e ? '<div style="margin-top:6px">解析：' + H(q.e) + '</div>' : '') +
        '</div>';

      // 选项着色
      UI.qsa('[data-opt]').forEach(function (b) {
        b.classList.add('is-locked');
        var v = b.getAttribute('data-opt');
        var isAns = q.t === 'judge' ? (String(q.a) === v) : (Number(v) === q.a);
        if (q.t === 'multi') isAns = q.a.indexOf(Number(v)) >= 0;
        var isPick = q.t === 'multi' ? pending.indexOf(Number(v)) >= 0 : (q.t === 'judge' ? String(pending) === v : pending === Number(v));
        if (isAns) b.classList.add('is-right');
        else if (isPick) b.classList.add('is-wrong');
        b.classList.remove('is-pick');
      });
      if (q.t === 'order') {
        UI.qsa('.order-item').forEach(function (row, pos) {
          var right = orderState[pos] === q.a[pos];
          row.style.borderColor = right ? 'var(--jade)' : 'var(--coral)';
          row.style.background = right ? 'var(--jade-soft)' : 'var(--coral-soft)';
        });
      }
      if (q.t === 'blank') {
        var inp = UI.el('blankInput');
        if (inp) { inp.disabled = true; inp.style.borderColor = correctNow ? 'var(--jade)' : 'var(--coral)'; }
      }

      var res = DB.record(q, correctNow, pending, { shield: lastShield, isReview: opts.mode === 'review' });
      UI.beep(correctNow);
      if (res.unlocked && res.unlocked.length) {
        res.unlocked.forEach(function (a) { UI.toast('解锁成就「' + a.n + '」'); });
      }
      results.push({ q: q, correct: correctNow, ans: pending });

      var mainBtn = UI.el('mainBtn');
      mainBtn.disabled = false;
      mainBtn.textContent = idx === questions.length - 1 ? '查看结果' : '下一题';
    }

    function next() {
      if (idx === questions.length - 1) { finish(); return; }
      idx++;
      paint();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function finish() {
      UI.stopSpeak();
      var used = Math.round((Date.now() - started) / 1000);
      var acc = doneCount ? Math.round(okCount / doneCount * 100) : 0;
      var wrong = results.filter(function (r) { return !r.correct; });
      root.innerHTML = '<div class="quiz"><div class="card" style="text-align:center;padding:28px">' +
        '<div style="display:flex;justify-content:center;margin-bottom:14px">' + UI.ring(acc, acc + '%', '正确率') + '</div>' +
        '<h2 style="font-family:var(--ff-serif);font-size:20px">' + (acc >= 80 ? '这组练得很稳' : acc >= 60 ? '还有提升空间' : '错得多，正好补漏') + '</h2>' +
        '<p class="small muted" style="margin-top:4px">本组 ' + doneCount + ' 题 · 答对 ' + okCount + ' 题 · 用时 ' + UI.fmtDur(used) + '</p>' +
        '<div class="grid-3" style="margin-top:20px">' +
        '<div class="card card--flat"><b class="num" style="font-size:22px">' + okCount + '</b><div class="small muted">答对</div></div>' +
        '<div class="card card--flat"><b class="num" style="font-size:22px;color:var(--coral)">' + wrong.length + '</b><div class="small muted">答错</div></div>' +
        '<div class="card card--flat"><b class="num" style="font-size:22px">' + DB.stats().due + '</b><div class="small muted">今日待复习</div></div>' +
        '</div>' +
        '<div class="row" style="justify-content:center;margin-top:20px">' +
        '<a class="btn btn--outline" href="#/practice">再练一组</a>' +
        (wrong.length ? '<a class="btn btn--outline" href="#/wrong">看错题</a>' : '') +
        '<a class="btn btn--primary" href="#/home">回首页</a></div></div></div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    paint();
  }

  window.Views = window.Views || {};
  window.Views.practice = { title: '练习', render: render };
  window.Views._startQuiz = startQuiz;
})();
