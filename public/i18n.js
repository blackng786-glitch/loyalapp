/* ChopKar i18n — 共享中英切换引擎
   用法: 各页面 <head> 加 <script src="/i18n.js"></script> 即可。
   原理: 字典 key = 页面里出现的原文(中或英均可), 值含 {zh,en}。
   引擎自动检测语言、注入浮动「中/EN」按钮、翻译静态+动态文案。 */
(function () {
  var DICT = {
    // ── 通用 ──
    "Cancel": { zh: "取消", en: "Cancel" },
    "Confirm": { zh: "确认", en: "Confirm" },
    "Close": { zh: "关闭", en: "Close" },
    "Add": { zh: "添加", en: "Add" },
    "Copy": { zh: "复制", en: "Copy" },
    "Loading...": { zh: "加载中...", en: "Loading..." },
    "加载中...": { zh: "加载中...", en: "Loading..." },
    "Merchant not found": { zh: "商家未找到", en: "Merchant not found" },
    "商家未找到": { zh: "商家未找到", en: "Merchant not found" },
    "Bronze": { zh: "青铜", en: "Bronze" }, "Silver": { zh: "白银", en: "Silver" },
    "Gold": { zh: "黄金", en: "Gold" }, "Platinum": { zh: "铂金", en: "Platinum" },
    // ── CARD 会员卡 ──
    "Member Rewards": { zh: "会员奖励", en: "Member Rewards" },
    "Your Phone Number": { zh: "你的手机号", en: "Your Phone Number" },
    "Find My Card": { zh: "查找我的卡", en: "Find My Card" },
    "New member?": { zh: "新会员?", en: "New member?" },
    "Join for Free": { zh: "免费加入", en: "Join for Free" },
    "Back": { zh: "返回", en: "Back" },
    "Join the Club": { zh: "加入会员", en: "Join the Club" },
    "Every visit earns you rewards": { zh: "每次到店都有奖励", en: "Every visit earns you rewards" },
    "Full Name": { zh: "姓名", en: "Full Name" },
    "Phone Number": { zh: "手机号", en: "Phone Number" },
    "Create My Card": { zh: "创建我的卡", en: "Create My Card" },
    "By joining you agree to receive updates from this business": { zh: "加入即表示同意接收本商家的消息", en: "By joining you agree to receive updates from this business" },
    "Stamps": { zh: "印章", en: "Stamps" },
    "Rewards": { zh: "奖励", en: "Rewards" },
    "History": { zh: "历史", en: "History" },
    "My QR": { zh: "我的二维码", en: "My QR" },
    "Current Card": { zh: "当前卡", en: "Current Card" },
    "How it works": { zh: "使用说明", en: "How it works" },
    "Show your QR code or give your phone number to staff after each visit to earn stamps. Collect enough stamps to redeem rewards!": { zh: "每次到店向店员出示二维码或报手机号即可集章,集满即可兑换奖励!", en: "Show your QR code or give your phone number to staff after each visit to earn stamps. Collect enough stamps to redeem rewards!" },
    "Show this to staff after every visit": { zh: "每次到店向店员出示", en: "Show this to staff after every visit" },
    "Confirm Redemption": { zh: "确认兑换", en: "Confirm Redemption" },
    "Show this screen to staff to complete your redemption.": { zh: "向店员出示此页面以完成兑换。", en: "Show this screen to staff to complete your redemption." },
    "Install to Home Screen": { zh: "添加到主屏幕", en: "Install to Home Screen" },
    "Add to Home Screen": { zh: "添加到主屏幕", en: "Add to Home Screen" },
    "Access your card anytime without opening a browser": { zh: "无需打开浏览器,随时查看你的卡", en: "Access your card anytime without opening a browser" },
    "Install": { zh: "安装", en: "Install" },
    "Points": { zh: "积分", en: "Points" },
    "Free": { zh: "免费", en: "Free" },
    "Enable notifications": { zh: "开启通知", en: "Enable notifications" },
    "Get notified when stamps are added and rewards are ready": { zh: "集章和奖励到账时通知你", en: "Get notified when stamps are added and rewards are ready" },
    "Enable": { zh: "开启", en: "Enable" },
    "Check the link and try again.": { zh: "请检查链接后重试。", en: "Check the link and try again." },
    "Search name or phone...": { zh: "搜索姓名或手机...", en: "Search name or phone..." },
    // ── BOTTLE 存酒卡 ──
    "存酒清单": { zh: "存酒清单", en: "My Bottles" },
    "我的券": { zh: "我的券", en: "My Vouchers" },
    "您暂无存酒": { zh: "您暂无存酒", en: "You have no bottles yet" },
    "请联系吧台登记": { zh: "请联系吧台登记", en: "Please ask the bar to register one" },
    "您暂无储值券": { zh: "您暂无储值券", en: "You have no vouchers" },
    "请先注册会员": { zh: "请先注册会员", en: "Please register first" },
    "先在会员卡页面登记手机号,即可查看您的存酒": { zh: "先在会员卡页面登记手机号,即可查看您的存酒", en: "Register your phone on the member card page to view your bottles" },
    "去会员卡注册": { zh: "去会员卡注册", en: "Go to member card" },
    "请检查链接": { zh: "请检查链接", en: "Check the link" },
    "Bottle Keep · 存酒": { zh: "存酒 Bottle Keep", en: "Bottle Keep" },
    "流水": { zh: "流水", en: "History" },
    "暂无记录": { zh: "暂无记录", en: "No records" },
    "已过期": { zh: "已过期", en: "Expired" },
    "加载失败": { zh: "加载失败", en: "Load failed" },
    // ── STAFF 员工 ──
    "Enter your PIN to continue": { zh: "输入 PIN 继续", en: "Enter your PIN to continue" },
    "Members": { zh: "会员", en: "Members" },
    "Dashboard": { zh: "仪表盘", en: "Dashboard" },
    "存酒": { zh: "存酒", en: "Bottle Keep" },
    "Scan QR": { zh: "扫码", en: "Scan QR" },
    "Add Stamp": { zh: "盖章", en: "Add Stamp" },
    "Confirm Stamp": { zh: "确认盖章", en: "Confirm Stamp" },
    "Redeem": { zh: "兑换", en: "Redeem" },
    "Today": { zh: "今日", en: "Today" },
    "This Week": { zh: "本周", en: "This Week" },
    "Redemptions": { zh: "兑换次数", en: "Redemptions" },
    "Recent Activity": { zh: "最近动态", en: "Recent Activity" },
    "stamps": { zh: "印章", en: "stamps" },
    "this week": { zh: "本周", en: "this week" },
    "SCAN MEMBER QR": { zh: "扫描会员二维码", en: "SCAN MEMBER QR" },
    "Point camera at member's QR code": { zh: "将摄像头对准会员二维码", en: "Point camera at member's QR code" },
    "Incorrect PIN": { zh: "PIN 错误", en: "Incorrect PIN" },
    "搜索会员开始登记存酒 / 扣量": { zh: "搜索会员开始登记存酒 / 扣量", en: "Search a member to deposit / pour" },
    "无匹配会员": { zh: "无匹配会员", en: "No matching member" },
    "登记新存酒": { zh: "登记新存酒", en: "New Bottle" },
    "该会员存酒": { zh: "该会员存酒", en: "Member's Bottles" },
    "暂无存酒": { zh: "暂无存酒", en: "No bottles" },
    "登记存酒": { zh: "登记存酒", en: "Deposit" },
    "扣量": { zh: "扣量", en: "Pour" },
    "发储值券": { zh: "发储值券", en: "Issue Voucher" },
    "发券": { zh: "发券", en: "Issue" },
    "该会员券": { zh: "该会员券", en: "Member's Vouchers" },
    "暂无券": { zh: "暂无券", en: "No vouchers" },
    "使用": { zh: "使用", en: "Redeem" },
    "次卡(按次)": { zh: "次卡(按次)", en: "Sessions (by count)" },
    "储值(按金额)": { zh: "储值(按金额)", en: "Credit (by amount)" },
    "请输入扣量": { zh: "请输入扣量", en: "Enter pour amount" },
    "请填品牌和容量": { zh: "请填品牌和容量", en: "Enter brand and size" },
    "存酒已登记": { zh: "存酒已登记", en: "Bottle registered" },
    "扣量失败": { zh: "扣量失败", en: "Pour failed" },
    "登记失败": { zh: "登记失败", en: "Register failed" },
    "请输入使用量": { zh: "请输入使用量", en: "Enter amount" },
    "已使用": { zh: "已使用", en: "Redeemed" },
    "使用失败": { zh: "使用失败", en: "Redeem failed" },
    "请输入总量": { zh: "请输入总量", en: "Enter total" },
    "券已发放": { zh: "券已发放", en: "Voucher issued" },
    "发券失败": { zh: "发券失败", en: "Issue failed" },
    "剩余酒量不足": { zh: "剩余酒量不足", en: "Not enough remaining" },
    "余额不足": { zh: "余额不足", en: "Insufficient balance" },
    // placeholders (staff)
    "搜索会员姓名或手机...": { zh: "搜索会员姓名或手机...", en: "Search member name or phone..." },
    "品牌 如 Hennessy XO": { zh: "品牌 如 Hennessy XO", en: "Brand e.g. Hennessy XO" },
    "容量 ml": { zh: "容量 ml", en: "Size ml" },
    "标签 如 10次套餐": { zh: "标签 如 10次套餐", en: "Label e.g. 10-session pack" },
    "总次数 / 金额": { zh: "总次数 / 金额", en: "Total count / amount" },
    "次数": { zh: "次数", en: "Count" }, "金额": { zh: "金额", en: "Amount" },
    // ── DASHBOARD 商家后台 ──
    "Merchant Portal": { zh: "商家后台", en: "Merchant Portal" },
    "Sign in to manage your loyalty program": { zh: "登录以管理你的会员计划", en: "Sign in to manage your loyalty program" },
    "Email": { zh: "邮箱", en: "Email" },
    "Password": { zh: "密码", en: "Password" },
    "Sign In": { zh: "登录", en: "Sign In" },
    "New merchant? Create account": { zh: "新商家?创建账号", en: "New merchant? Create account" },
    "Create Account": { zh: "创建账号", en: "Create Account" },
    "Already have an account? Sign in": { zh: "已有账号?去登录", en: "Already have an account? Sign in" },
    "Sign out": { zh: "退出", en: "Sign out" },
    "Setup Wizard": { zh: "设置向导", en: "Setup Wizard" },
    "Set up your loyalty program": { zh: "设置你的会员计划", en: "Set up your loyalty program" },
    "Takes 2 minutes": { zh: "约需 2 分钟", en: "Takes 2 minutes" },
    "Business Info": { zh: "商家信息", en: "Business Info" },
    "Business Name": { zh: "商家名称", en: "Business Name" },
    "Card Design": { zh: "卡片设计", en: "Card Design" },
    "Brand Color": { zh: "品牌色", en: "Brand Color" },
    "Stamp Program": { zh: "印章方案", en: "Stamp Program" },
    "Stamps per card": { zh: "每卡印章数", en: "Stamps per card" },
    "Reward Name": { zh: "奖励名称", en: "Reward Name" },
    "Services": { zh: "服务项目", en: "Services" },
    "Staff PIN": { zh: "员工 PIN", en: "Staff PIN" },
    "Launch My Loyalty Program": { zh: "启动我的会员计划", en: "Launch My Loyalty Program" },
    "Your Links": { zh: "你的链接", en: "Your Links" },
    "Share these with customers and staff": { zh: "把这些分享给顾客和员工", en: "Share these with customers and staff" },
    "Member Card": { zh: "会员卡", en: "Member Card" },
    "Staff Panel": { zh: "员工面板", en: "Staff Panel" },
    "Total Members": { zh: "会员总数", en: "Total Members" },
    "Stamps Today": { zh: "今日盖章", en: "Stamps Today" },
    "All Members": { zh: "所有会员", en: "All Members" },
    "Export CSV": { zh: "导出 CSV", en: "Export CSV" },
    "Name": { zh: "姓名", en: "Name" }, "Phone": { zh: "手机", en: "Phone" },
    "Tier": { zh: "等级", en: "Tier" }, "Joined": { zh: "加入日期", en: "Joined" },
    "Marketing Notifications": { zh: "营销通知", en: "Marketing Notifications" },
    "Send now, schedule for later, or auto win-back lapsed customers": { zh: "立即发送、定时发送,或自动挽回流失顾客", en: "Send now, schedule for later, or auto win-back lapsed customers" },
    "Send Now": { zh: "立即发送", en: "Send Now" },
    "Schedule": { zh: "定时", en: "Schedule" },
    "Win-Back": { zh: "挽回", en: "Win-Back" },
    "Title": { zh: "标题", en: "Title" }, "Message": { zh: "内容", en: "Message" },
    "Send At": { zh: "发送时间", en: "Send At" },
    "Preview": { zh: "预览", en: "Preview" },
    "Scheduled & Recent": { zh: "定时与最近", en: "Scheduled & Recent" },
    "No scheduled notifications": { zh: "暂无定时通知", en: "No scheduled notifications" },
    "Branches / Locations": { zh: "门店 / 地点", en: "Branches / Locations" },
    "Recent Activity": { zh: "最近动态", en: "Recent Activity" },
    "No activity yet": { zh: "暂无动态", en: "No activity yet" },
    "酒窖 Bottle Keep": { zh: "酒窖 Bottle Keep", en: "Cellar · Bottle Keep" },
    "会员存酒管理与过期预警（按到期日排序）": { zh: "会员存酒管理与过期预警（按到期日排序）", en: "Member bottle management & expiry alerts (sorted by expiry)" },
    "存酒总瓶数": { zh: "存酒总瓶数", en: "Active Bottles" },
    "本周到期": { zh: "本周到期", en: "Expiring" },
    "已清空": { zh: "已清空", en: "Emptied" },
    "品牌": { zh: "品牌", en: "Brand" }, "剩余": { zh: "剩余", en: "Remaining" },
    "进度": { zh: "进度", en: "Progress" }, "到期": { zh: "到期", en: "Expiry" },
    "状态": { zh: "状态", en: "Status" }, "会员": { zh: "会员", en: "Member" },
    "正常": { zh: "正常", en: "OK" }, "即将到期": { zh: "即将到期", en: "Expiring" },
    "无存酒": { zh: "无存酒", en: "No bottles" },
    "功能开关 Features": { zh: "功能开关 Features", en: "Features" },
    "开启 / 关闭本店的功能模块": { zh: "开启 / 关闭本店的功能模块", en: "Enable / disable feature modules" },
    "印章卡": { zh: "印章卡", en: "Stamp Card" },
    "集印章换奖励": { zh: "集印章换奖励", en: "Collect stamps for rewards" },
    "存酒 Bottle Keep": { zh: "存酒 Bottle Keep", en: "Bottle Keep" },
    "酒吧存酒 / 扣量": { zh: "酒吧存酒 / 扣量", en: "Bar bottle keep / pour" },
    "储值券": { zh: "储值券", en: "Vouchers" },
    "次卡 / 储值卡": { zh: "次卡 / 储值卡", en: "Session / credit cards" },
    "保存功能开关": { zh: "保存功能开关", en: "Save Features" },
    "Branding 品牌设置": { zh: "品牌设置 Branding", en: "Branding" },
    "自定义会员卡颜色与 Logo（仅影响顾客会员卡，不影响 ChopKar 平台界面）": { zh: "自定义会员卡颜色与 Logo（仅影响顾客会员卡，不影响 ChopKar 平台界面）", en: "Customize card color & logo (affects the customer card only)" },
    "Card Color 卡片主色": { zh: "卡片主色 Card Color", en: "Card Color" },
    "Page Background 页面背景色": { zh: "页面背景色 Page Background", en: "Page Background" },
    "上传 Logo": { zh: "上传 Logo", en: "Upload Logo" },
    "保存品牌设置": { zh: "保存品牌设置", en: "Save Branding" },
    "实时预览 Live Preview": { zh: "实时预览 Live Preview", en: "Live Preview" },
    "恢复自动": { zh: "恢复自动", en: "Auto" },
    "ChopKar 平台界面颜色不受此影响": { zh: "ChopKar 平台界面颜色不受此影响", en: "ChopKar platform colors are unaffected" },
    "功能开关已保存！": { zh: "功能开关已保存！", en: "Features saved!" },
    "品牌设置已保存！": { zh: "品牌设置已保存！", en: "Branding saved!" },
    "保存失败": { zh: "保存失败", en: "Save failed" },
    "Link copied!": { zh: "链接已复制!", en: "Link copied!" },
    "CSV downloaded!": { zh: "CSV 已下载!", en: "CSV downloaded!" },
    "顾客会员卡页面背景": { zh: "顾客会员卡页面背景", en: "Customer card page background" },
    // dashboard placeholders
    "Search name or phone...": { zh: "搜索姓名或手机...", en: "Search name or phone..." },
    "搜索会员 / 品牌 / 手机...": { zh: "搜索会员 / 品牌 / 手机...", en: "Search member / brand / phone..." },
    "you@business.com": { zh: "you@business.com", en: "you@business.com" }
  };

  function detect() {
    var s; try { s = localStorage.getItem('chopkar_lang'); } catch (e) {}
    if (s === 'zh' || s === 'en') return s;
    var n = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return n.indexOf('zh') === 0 ? 'zh' : 'en';
  }
  var LANG = detect();
  var observer = null, scheduled = false, applying = false;

  window.CK_LANG = function () { return LANG; };
  window.t = function (k, fb) { var e = DICT[k]; return e ? (e[LANG] || k) : (fb !== undefined ? fb : k); };

  function translateText(node) {
    var raw = node.nodeValue; if (!raw) return;
    var trimmed = raw.trim(); if (!trimmed) return;
    var key = node.__ckKey;
    if (key === undefined) {
      if (DICT[trimmed]) {
        key = trimmed; node.__ckKey = key;
        var i = raw.indexOf(trimmed);
        node.__ckLead = raw.slice(0, i); node.__ckTrail = raw.slice(i + trimmed.length);
      } else { node.__ckKey = null; return; }
    }
    if (key === null) return;
    var tr = DICT[key][LANG]; if (tr != null) node.nodeValue = node.__ckLead + tr + node.__ckTrail;
  }
  function translateAttr(el, attr, prop) {
    var cur = el.getAttribute(attr); if (cur == null) return;
    var key = el[prop];
    if (key === undefined) { var tk = cur.trim(); if (DICT[tk]) { key = tk; el[prop] = tk; } else { el[prop] = null; return; } }
    if (key === null) return;
    var tr = DICT[key][LANG]; if (tr != null) el.setAttribute(attr, tr);
  }
  function applyLang() {
    if (!document.body) return;
    applying = true;
    if (observer) observer.disconnect();
    document.documentElement.lang = LANG === 'zh' ? 'zh' : 'en';
    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (p.id === 'ck-lang') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
    for (var i = 0; i < nodes.length; i++) translateText(nodes[i]);
    var ph = document.querySelectorAll('[placeholder]');
    for (var j = 0; j < ph.length; j++) translateAttr(ph[j], 'placeholder', '__ckPh');
    var ti = document.querySelectorAll('[title]');
    for (var k = 0; k < ti.length; k++) translateAttr(ti[k], 'title', '__ckTi');
    updateBtn();
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
    applying = false;
  }
  window.applyLang = applyLang;

  window.setLang = function (l) {
    if (l !== 'zh' && l !== 'en' || l === LANG) return;
    LANG = l; try { localStorage.setItem('chopkar_lang', l); } catch (e) {}
    applyLang();
    try { window.dispatchEvent(new Event('ck-langchange')); } catch (e) {}
  };

  function updateBtn() { var b = document.getElementById('ck-lang'); if (b) b.textContent = LANG === 'zh' ? 'EN' : '中'; }
  function makeBtn() {
    if (document.getElementById('ck-lang')) return;
    var b = document.createElement('button');
    b.id = 'ck-lang'; b.type = 'button'; b.setAttribute('aria-label', 'Switch language');
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:90;background:rgba(0,0,0,0.55);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:7px 14px;font:500 13px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,0.28);line-height:1';
    b.onclick = function () { window.setLang(LANG === 'zh' ? 'en' : 'zh'); };
    document.body.appendChild(b);
  }

  function init() {
    makeBtn();
    applyLang();
    observer = new MutationObserver(function () { if (!applying && !scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; applyLang(); }); } });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
