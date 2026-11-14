(function () {
  'use strict';
  var H = UI.esc;
  var GROUP_NAME = { single: '一、单项选择题', judge: '二、判断题', blank: '三、填空题', order: '四、步骤排序题', multi: '五、多项选择题' };
  var WEIGHT = { single: 2, judge: 2, blank: 2.5, order: 4, multi: 2.5 };
  var DESIRED = [['single', 20], ['judge', 10], ['blank', 8], ['order', 4]];
  var TYPES = ['single', 'judge', 'blank', 'order'];
  var TIMER = null;

  function clearTimer() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }
  window.addEventListener('hashchange', clearTimer);

  // ---------------- 组卷 ----------------
  function compose(pool) {
    var counts = {}, deficit = 0;
    DESIRED.forEach(function (d) {
      var take = Math.min(d[1], pool[d[0]].length);
      counts[d[0]] = take;
      deficit += d[1] - take;
    });
    var order = ['single', 'judge', 'blank', 'order'];
    var guard = 0;
    while (deficit > 0 && guard++ < 600) {
      var moved = false;
      for (var i = 0; i < order.length && deficit > 0; i++) {
        var t = order[i];
        if (pool[t].length > counts[t]) { counts[t]++; deficit--; moved = true; }
      }
      if (!moved) break;
    }
    return counts;
  }

  function buildPaper(opt) {
    var all = Bank.all().filter(function (q) { return q.s !== 'my'; });
    var list = all, title = '标准模拟卷', sub = '7 科混合 · 按题型分四大题';
    if (opt.kind === 'subject') {
      var s = Bank.subject(opt.s);
      if (!s) return null;
      list = all.filter(function (q) { return q.s === opt.s; });
      title = s.n + ' · 单科卷';
      sub = s.n + ' 单科专项';
    } else if (opt.kind === 'mix') {
      title = '综合卷';
      sub = '按科目题量权重混合';
    } else if (opt.kind === 'grade') {
      var g = Number(opt.g || 1);
      if (g === 1) { list = all.filter(function (q) { return q.d === 1; }); title = '高一基础卷'; sub = '只取基础难度题'; }
      else if (g === 2) { list = all.filter(function (q) { return q.d <= 2; }); title = '高二提升卷'; sub = '基础 + 中等难度'; }
      else { title = '高三综合卷'; sub = '全部难度，接近真题强度'; }
    }
    if (!list.length) return null;

    var pool = {};
    TYPES.forEach(function (t) { pool[t] = UI.shuffle(list.filter(function (q) { return q.t === t; })); });
    var counts = compose(pool);
    var picked = {};
    TYPES.forEach(function (t) { picked[t] = pool[t].slice(0, counts[t]); });

    var groups = TYPES.map(function (t) {
      return { t: t, name: GROUP_NAME[t], n: picked[t].length, qs: picked[t] };
    }).filter(function (g) { return g.n > 0; });

    var raw = 0;
    groups.forEach(function (g) { raw += g.n * WEIGHT[g.t]; });
    var used = 0;
    groups.forEach(function (g, i) {
      var sc = (i === groups.length - 1) ? (100 - used) : Math.max(g.n, Math.round(100 * g.n * WEIGHT[g.t] / raw));
      g.score = sc;
      used += sc;
    });

    var count = groups.reduce(function (a, g) { return a + g.n; }, 0);
    return {
      kind: opt.kind || 'std', s: opt.s || '', g: opt.g || '',
      title: title, sub: sub, duration: 90 * 60, groups: groups, count: count
    };
  }

  // ---------------- 考试入口 ----------------
  function renderExam(root) {
    clearTimer();
    var st = DB.stats();
    var recent = DB.exams().slice(0, 5);

    var subjects = Bank.subjects().filter(function (s) { return s.k !== 'my'; });
    var subjCards = subjects.map(function (s) {
      var ss = (function () {
        var rows = DB.chapterStats(s.k), n = 0, ok = 0;
        rows.forEach(function (r) { n += r.n; ok += r.ok; });
        return { n: n, acc: n ? Math.round(ok / n * 100) : null };
      })();
      return '<a class="paper-card" href="#/paper?kind=subject&s=' + s.k + '">' +
        '<div class="row"><span class="subj-card__mark" style="background:' + s.c + '">' + H(s.short) + '</span>' +
        '<h3>' + H(s.n) + ' 单科卷</h3></div>' +
        '<div class="meta"><span>42 题</span><span>100 分</span><span>90 分钟</span></div>' +
        '<div class="paper-card__rule">' + (ss.acc == null ? '尚未练习，适合摸底' : '该科正确率 ' + ss.acc + '%') + '</div></a>';
    }).join('');

    var recentHtml = recent.length ? '<div class="card"><div class="card__head"><h3 class="card__title">最近考试</h3>' +
      '<a class="card__more" href="#/stats">学习统计 ›</a></div>' +
      recent.map(function (e) {
        return '<a class="todo" href="#/report?id=' + e.id + '">' +
          '<div class="todo__ico ' + (e.score >= 60 ? 'todo__ico--jade' : 'todo__ico--coral') + '">' + Math.round(e.score) + '</div>' +
          '<div class="todo__body"><b>' + H(e.title) + '</b><span>' + H(e.date || '') + ' · 答对 ' + e.ok + '/' + e.count + ' 题 · 用时 ' + UI.fmtDur(e.used) + '</span></div>' +
          '<span class="todo__go">成绩单</span></a>';
      }).join('') + '</div>' : '';

    root.innerHTML = '<div class="page-head"><div><h2>模拟考试</h2>' +
      '<p>标准卷 42 题 / 100 分 / 限时 90 分钟，四大题按题型排列；交卷后自动判分并生成成绩报告。</p></div>' +
      '<span class="chip chip--jade">历史最好 ' + (st.bestExam ? st.bestExam + ' 分' : '—') + '</span></div>' +
      '<div class="paper-grid">' +
      '<a class="paper-card" href="#/paper?kind=std"><div class="row"><span class="subj-card__mark" style="background:var(--jade)">标</span><h3>标准模拟卷</h3></div>' +
      '<div class="meta"><span>42 题</span><span>100 分</span><span>90 分钟</span></div>' +
      '<div class="paper-card__rule">单选 · 判断 · 填空 · 排序，7 科混合</div></a>' +
      '<a class="paper-card" href="#/paper?kind=mix"><div class="row"><span class="subj-card__mark" style="background:var(--blue)">综</span><h3>综合卷</h3></div>' +
      '<div class="meta"><span>42 题</span><span>100 分</span><span>90 分钟</span></div>' +
      '<div class="paper-card__rule">按各科题量权重混合抽题</div></a>' +
      '<a class="paper-card" href="#/paper?kind=grade&g=1"><div class="row"><span class="subj-card__mark" style="background:var(--gold)">一</span><h3>高一基础卷</h3></div>' +
      '<div class="meta"><span>42 题</span><span>100 分</span><span>90 分钟</span></div>' +
      '<div class="paper-card__rule">只取基础难度，适合入门自测</div></a>' +
      '<a class="paper-card" href="#/paper?kind=grade&g=3"><div class="row"><span class="subj-card__mark" style="background:var(--coral)">三</span><h3>高三综合卷</h3></div>' +
      '<div class="meta"><span>42 题</span><span>100 分</span><span>90 分钟</span></div>' +
      '<div class="paper-card__rule">全难度综合，冲刺阶段使用</div></a>' +
      '</div>' +
      '<div class="section-title">单科卷 · 任选一科</div>' +
      '<div class="paper-grid">' + subjCards + '</div>' +
      (recentHtml ? '<div class="section-title">考试记录</div>' + recentHtml : '') +
      '<div class="row row--wrap" style="margin-top:18px">' +
      '<a class="btn btn--outline btn--sm" href="#/paper?kind=grade&g=2">高二提升卷</a>' +
      '<a class="btn btn--outline btn--sm" href="#/wrong">先复习错题</a>' +
      '<a class="btn btn--outline btn--sm" href="#/mastery">查看薄弱章节</a></div>';
  }

  // ---------------- 答题 ----------------
  function renderPaper(root, p) {
    clearTimer();
    var paper = buildPaper({ kind: p.q.kind || 'std', s: p.q.s, g: p.q.g });
    if (!paper) {
      root.innerHTML = UI.empty('卷', '暂时无法组卷', '这个范围内的题目不足，换个类型试试。', '<a class="btn btn--primary" href="#/exam">返回考试中心</a>');
      return;
    }

    var ans = {};
    var touched = {};
    var orders = {};
    var flat = [];
    paper.groups.forEach(function (g) {
      g.qs.forEach(function (q) {
        flat.push(q);
        if (q.t === 'order') orders[q.id] = UI.shuffle(q.o.map(function (_, i) { return i; }));
      });
    });

    function answered(q) {
      if (q.t === 'order') return !!touched[q.id];
      if (q.t === 'multi') return Array.isArray(ans[q.id]) && ans[q.id].length > 0;
      if (q.t === 'blank') return !!String(ans[q.id] || '').trim();
      return ans[q.id] != null;
    }
    function answeredCount() { return flat.filter(answered).length; }

    function optionsHtml(q, i) {
      if (q.t === 'judge') {
        return '<div class="opts opts--row"><button class="opt" data-q="' + i + '" data-opt="1"><span class="opt__key">✓</span><span>正确</span></button>' +
          '<button class="opt" data-q="' + i + '" data-opt="0"><span class="opt__key">✕</span><span>错误</span></button></div>';
      }
      if (q.t === 'blank') {
        return '<div class="fill"><input type="text" data-in="' + i + '" placeholder="请输入答案" autocomplete="off"></div>';
      }
      if (q.t === 'order') {
        return '<div class="order-list" data-order="' + i + '">' + orders[q.id].map(function (oi, pos) {
          return '<div class="order-item"><span class="order-item__no">' + (pos + 1) + '</span>' +
            '<span class="order-item__text">' + H(q.o[oi]) + '</span>' +
            '<span class="order-item__btns"><button data-move="up" data-q="' + i + '" data-pos="' + pos + '"' + (pos === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button data-move="down" data-q="' + i + '" data-pos="' + pos + '"' + (pos === orders[q.id].length - 1 ? ' disabled' : '') + '>↓</button></span></div>';
        }).join('') + '</div><p class="small muted" style="margin-top:8px">用 ↑ ↓ 调整步骤顺序。</p>';
      }
      return '<div class="opts">' + q.o.map(function (o, k) {
        return '<button class="opt" data-q="' + i + '" data-opt="' + k + '"><span class="opt__key">' + Bank.LETTER[k] + '</span><span>' + H(o) + '</span></button>';
      }).join('') + '</div>';
    }

    var body = '';
    var no = 0;
    paper.groups.forEach(function (g) {
      body += '<div class="card paper-sec"><div class="card__head"><h3 class="card__title">' + g.name + '</h3>' +
        '<span class="small muted">' + g.n + ' 题 · ' + g.score + ' 分</span></div>' +
        g.qs.map(function (q) {
          no++;
          var i = no - 1;
          return '<div class="exam-q" id="eq-' + i + '">' +
            '<div class="qcard__meta"><span class="chip chip--on">' + no + '</span>' + UI.typeChip(q) +
            '<span class="chip">' + H(q.kp || '') + '</span><span class="spacer"></span>' +
            '<span class="small muted">' + H(q.ch || '') + '</span></div>' +
            '<div class="qcard__stem">' + H(q.q).replace(/______/g, '<span class="blank">______</span>') + '</div>' +
            optionsHtml(q, i) + '</div>';
        }).join('') + '</div>';
    });

    root.innerHTML = '<div id="paperWrap"><div class="exam-head no-print">' +
      '<button class="icon-btn" data-act="quit" aria-label="退出考试">' + UI.icon('left') + '</button>' +
      '<div><b style="font-size:14px">' + H(paper.title) + '</b><div class="small muted">' + H(paper.sub) + '</div></div>' +
      '<span class="spacer"></span>' +
      '<span class="small muted" id="examProg">已答 0 / ' + paper.count + '</span>' +
      '<span class="timer" id="timer">90:00</span>' +
      '<button class="btn btn--primary btn--sm" id="submitBtn">交卷</button></div>' +
      '<div class="exam-layout"><div class="stack">' + body + '</div>' +
      '<aside class="card no-print exam-side"><div class="card__head"><h3 class="card__title">答题卡</h3></div>' +
      '<div class="palette" id="palette"></div>' +
      '<p class="small muted" style="margin-top:10px">绿色为已作答，点击题号跳转。</p>' +
      '<button class="btn btn--outline btn--block btn--sm" id="submitBtn2" style="margin-top:8px">交卷</button></aside></div></div>';

    function paintPalette() {
      UI.el('palette').innerHTML = flat.map(function (q, i) {
        return '<button data-jump="' + i + '" class="' + (answered(q) ? 'is-done' : '') + '">' + (i + 1) + '</button>';
      }).join('');
      UI.el('examProg').textContent = '已答 ' + answeredCount() + ' / ' + flat.length;
    }

    function repaintQuestion(i) {
      var q = flat[i];
      var box = UI.el('eq-' + i);
      if (!box) return;
      UI.qsa('.opt', box).forEach(function (b) {
        var v = b.getAttribute('data-opt');
        var on = false;
        if (q.t === 'judge') on = ans[q.id] === (v === '1');
        else if (q.t === 'multi') on = Array.isArray(ans[q.id]) && ans[q.id].indexOf(Number(v)) >= 0;
        else on = ans[q.id] === Number(v);
        b.classList.toggle('is-pick', on);
      });
      var inp = UI.qs('input[data-in]', box);
      if (inp && inp.value !== String(ans[q.id] || '')) inp.value = String(ans[q.id] || '');
    }

    var wrap = UI.el('paperWrap');

    function repaintOrder(i) {
      var q = flat[i];
      var host = UI.qs('[data-order="' + i + '"]', wrap);
      if (!host) return;
      host.innerHTML = orders[q.id].map(function (oi, pos) {
        return '<div class="order-item"><span class="order-item__no">' + (pos + 1) + '</span>' +
          '<span class="order-item__text">' + H(q.o[oi]) + '</span>' +
          '<span class="order-item__btns"><button data-move="up" data-q="' + i + '" data-pos="' + pos + '"' + (pos === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button data-move="down" data-q="' + i + '" data-pos="' + pos + '"' + (pos === orders[q.id].length - 1 ? ' disabled' : '') + '>↓</button></span></div>';
      }).join('');
    }

    wrap.addEventListener('click', function (e) {
      var jump = e.target.closest('[data-jump]');
      if (jump) {
        var target = UI.el('eq-' + jump.getAttribute('data-jump'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var mv = e.target.closest('[data-move]');
      if (mv) {
        var qi = Number(mv.getAttribute('data-q'));
        var q = flat[qi];
        var pos = Number(mv.getAttribute('data-pos'));
        var dir = mv.getAttribute('data-move') === 'up' ? -1 : 1;
        var arr = orders[q.id];
        var t = arr[pos]; arr[pos] = arr[pos + dir]; arr[pos + dir] = t;
        ans[q.id] = arr.slice();
        touched[q.id] = 1;
        repaintOrder(qi);
        paintPalette();
        return;
      }
      var opt = e.target.closest('[data-opt]');
      if (opt) {
        var i = Number(opt.getAttribute('data-q'));
        var qq = flat[i];
        var v = opt.getAttribute('data-opt');
        if (qq.t === 'multi') {
          var cur = Array.isArray(ans[qq.id]) ? ans[qq.id].slice() : [];
          var k = Number(v), at = cur.indexOf(k);
          if (at >= 0) cur.splice(at, 1); else cur.push(k);
          ans[qq.id] = cur;
        } else if (qq.t === 'judge') {
          ans[qq.id] = v === '1';
        } else {
          ans[qq.id] = Number(v);
        }
        touched[qq.id] = 1;
        repaintQuestion(i);
        paintPalette();
        return;
      }
      var act = e.target.closest('[data-act]');
      if (act && act.getAttribute('data-act') === 'quit') {
        UI.confirm('退出这场考试？', '本场作答不会保存，也不会生成成绩单。', '退出').then(function (ok) {
          if (ok) location.hash = '#/exam';
        });
      }
    });

    wrap.addEventListener('input', function (e) {
      var inp = e.target.closest('input[data-in]');
      if (!inp) return;
      var i = Number(inp.getAttribute('data-in'));
      var q = flat[i];
      ans[q.id] = inp.value;
      touched[q.id] = 1;
      paintPalette();
    });

    function tick() {
      var left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      var el = UI.el('timer');
      if (el) {
        el.textContent = UI.fmtDur(left);
        el.classList.toggle('is-warn', left <= 300);
      }
      if (left <= 0) {
        clearTimer();
        UI.toast('考试时间到，自动交卷');
        grade(true);
      }
    }

    var deadline = Date.now() + paper.duration * 1000;

    function grade(auto) {
      clearTimer();
      var total = 0, ok = 0, weak = {};
      var groups = paper.groups.map(function (g) {
        var per = g.score / g.n;
        var got = 0;
        g.qs.forEach(function (q) {
          var correct = Bank.check(q, ans[q.id]);
          if (correct) { ok++; got += per; }
          else if (q.kp) weak[q.kp] = (weak[q.kp] || 0) + 1;
          DB.record(q, correct, ans[q.id], { shield: false });
        });
        total += got;
        return { name: g.name, t: g.t, n: g.n, score: g.score, got: Math.round(got) };
      });

      var score = Math.max(0, Math.min(100, Math.round(total)));
      var weakArr = Object.keys(weak).map(function (kp) { return { kp: kp, n: weak[kp] }; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, 5);

      var rec = DB.saveExam({
        kind: paper.kind, s: paper.s, g: paper.g, title: paper.title,
        score: score, count: flat.length, ok: ok,
        used: Math.round((Date.now() - (deadline - paper.duration * 1000)) / 1000),
        date: DB.today(), at: Date.now(),
        groups: groups, weak: weakArr,
        qs: flat.map(function (q) { return q.id; }),
        ans: ans
      });
      UI.toast('交卷成功，得分 ' + score + ' 分');
      location.hash = '#/report?id=' + rec.id;
    }

    function submit() {
      var left = flat.length - answeredCount();
      var msg = left > 0 ? '还有 ' + left + ' 道题未作答，确定交卷吗？' : '全部题目已作答，确定交卷吗？';
      UI.confirm('交卷', msg, '交卷').then(function (ok) { if (ok) grade(false); });
    }
    UI.el('submitBtn').onclick = submit;
    UI.el('submitBtn2').onclick = submit;

    paintPalette();
    tick();
    TIMER = setInterval(tick, 1000);
  }

  // ---------------- 成绩报告 ----------------
  function renderReport(root, p) {
    clearTimer();
    var rec = DB.examById(p.q.id);
    if (!rec) {
      root.innerHTML = UI.empty('卷', '找不到这份成绩单', '可能记录已被清理，请重新参加模拟考试。',
        '<a class="btn btn--primary" href="#/exam">去考试</a>');
      return;
    }
    var pass = rec.score >= 60;
    var verdict = rec.score >= 90 ? '优秀：基本可以上考场了' : rec.score >= 75 ? '良好：再补几个薄弱点' :
      rec.score >= 60 ? '及格：基础还在，细节要抓' : '未及格：先把错题闭环跑起来';

    var bars = (rec.groups || []).map(function (g) {
      var pct = g.score ? Math.round(g.got / g.score * 100) : 0;
      return '<div class="bar-row"><span>' + H(g.name.replace(/^[一二三四五]、/, '')) + '</span>' +
        '<div class="bar-track"><i class="' + (pct < 60 ? 'is-bad' : '') + '" style="width:' + pct + '%"></i></div>' +
        '<span class="small muted">' + g.got + '/' + g.score + ' 分</span></div>';
    }).join('');

    var weak = (rec.weak || []).length ? (rec.weak || []).map(function (w, i) {
      return '<div class="todo"><div class="todo__ico todo__ico--coral">' + (i + 1) + '</div>' +
        '<div class="todo__body"><b>' + H(w.kp) + '</b><span>本卷失分 ' + w.n + ' 题</span></div>' +
        '<a class="todo__go" href="#/practice?kp=' + encodeURIComponent(w.kp) + '&limit=20">专项练</a></div>';
    }).join('') : '<p class="small muted">本卷没有明显集中的失分知识点。</p>';

    var detail = '';
    var ansMap = rec.ans || {};
    (rec.groups || []).forEach(function (g) {
      var rows = (rec.qs || []).map(function (id) { return Bank.byId(id); }).filter(function (q) {
        return q && g.t === q.t;
      });
      if (!rows.length) return;
      detail += '<div class="section-title">' + H(g.name) + '</div><div class="stack">' +
        rows.map(function (q) {
          var correct = Bank.check(q, ansMap[q.id]);
          return '<div class="wrong-item"><div class="wrong-item__head">' + UI.typeChip(q) +
            '<span class="chip ' + (correct ? 'chip--jade' : 'chip--coral') + '">' + (correct ? '答对' : '答错') + '</span>' +
            '<span class="chip">' + H(q.kp || '') + '</span></div>' +
            '<div class="wrong-item__stem">' + H(q.q) + '</div>' +
            '<div class="wrong-item__row"><span>你的答案：<b>' + H(Bank.userAnswerText(q, ansMap[q.id])) + '</b></span>' +
            '<span>正确答案：<b style="color:var(--jade)">' + H(Bank.answerText(q)) + '</b></span></div>' +
            (q.e ? '<div class="wrong-item__note">解析：' + H(q.e) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    });

    var again = '#/paper?kind=' + (rec.kind || 'std') +
      (rec.s ? '&s=' + rec.s : '') + (rec.g ? '&g=' + rec.g : '');

    root.innerHTML = '<div class="page-head no-print"><div><h2>成绩报告</h2>' +
      '<p>' + H(rec.title) + ' · ' + H(rec.date || '') + ' · 用时 ' + UI.fmtDur(rec.used || 0) + '</p></div>' +
      '<div class="row"><a class="btn btn--outline btn--sm" href="#/exam">考试中心</a>' +
      '<a class="btn btn--primary btn--sm" href="' + again + '">再来一套</a></div></div>' +
      '<div class="score-hero">' + UI.ring(rec.score, rec.score + '分', '满分 100') +
      '<div class="bars"><h3 style="font-family:var(--ff-serif);font-size:19px">' + verdict + '</h3>' +
      '<p class="small muted">答对 ' + rec.ok + ' / ' + rec.count + ' 题 · 正确率 ' +
      (rec.count ? Math.round(rec.ok / rec.count * 100) : 0) + '% · ' + (pass ? '达到及格线 60 分' : '距及格线还差 ' + (60 - rec.score) + ' 分') + '</p>' +
      bars + '</div></div>' +
      '<div class="grid-2" style="margin-top:18px"><div class="card"><div class="card__head">' +
      '<h3 class="card__title">失分 Top5 知识点</h3><a class="card__more" href="#/mastery">知识点地图 ›</a></div>' + weak + '</div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">下一步</h3></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--jade">复</div><div class="todo__body"><b>错题已自动排期</b>' +
      '<span>答错的题已进入 1/2/4/7/15/30 天复习队列</span></div><a class="todo__go" href="#/review">去复习</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--coral">错</div><div class="todo__body"><b>错题集</b>' +
      '<span>可打印成 A4 讲义，按科目分组</span></div><a class="todo__go" href="#/wrong">查看</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--gold">卷</div><div class="todo__body"><b>再练一套</b>' +
      '<span>同类型试卷重新抽题，不会重复原卷</span></div><a class="todo__go" href="' + again + '">开考</a></div></div></div>' +
      '<div class="section-title no-print">逐题对照</div>' + detail;
  }

  window.Views = window.Views || {};
  window.Views.exam = { title: '模拟考试', render: renderExam };
  window.Views.paper = { title: '正在考试', render: renderPaper };
  window.Views.report = { title: '成绩报告', render: renderReport };
})();
