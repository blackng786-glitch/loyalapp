/* ChopKar i18n — 中 / EN / BM 三语切换引擎
   用法: 各页面 <head> 加 <script src="/i18n.js"></script> 即可。
   原理: 字典 key = 页面里出现的原文, 值含 {zh,en,ms}。
   引擎自动检测语言、注入浮动「中/EN/BM」按钮、翻译静态+动态文案。 */
(function () {
  var DICT = {
    // ── 通用 ──
    "Cancel": { zh: "取消", en: "Cancel", ms: "Batal" },
    "Confirm": { zh: "确认", en: "Confirm", ms: "Sahkan" },
    "Close": { zh: "关闭", en: "Close", ms: "Tutup" },
    "Add": { zh: "添加", en: "Add", ms: "Tambah" },
    "Copy": { zh: "复制", en: "Copy", ms: "Salin" },
    "Loading...": { zh: "加载中...", en: "Loading...", ms: "Memuatkan..." },
    "加载中...": { zh: "加载中...", en: "Loading...", ms: "Memuatkan..." },
    "Merchant not found": { zh: "商家未找到", en: "Merchant not found", ms: "Peniaga tidak dijumpai" },
    "商家未找到": { zh: "商家未找到", en: "Merchant not found", ms: "Peniaga tidak dijumpai" },
    "Bronze": { zh: "青铜", en: "Bronze", ms: "Gangsa" },
    "Silver": { zh: "白银", en: "Silver", ms: "Perak" },
    "Gold": { zh: "黄金", en: "Gold", ms: "Emas" },
    "Platinum": { zh: "铂金", en: "Platinum", ms: "Platinum" },

    // ── CARD 会员卡 ──
    "Member Rewards": { zh: "会员奖励", en: "Member Rewards", ms: "Ganjaran Ahli" },
    "Your Phone Number": { zh: "你的手机号", en: "Your Phone Number", ms: "Nombor Telefon Anda" },
    "Find My Card": { zh: "查找我的卡", en: "Find My Card", ms: "Cari Kad Saya" },
    "New member?": { zh: "新会员?", en: "New member?", ms: "Ahli baharu?" },
    "Join for Free": { zh: "免费加入", en: "Join for Free", ms: "Sertai Percuma" },
    "Back": { zh: "返回", en: "Back", ms: "Kembali" },
    "Join the Club": { zh: "加入会员", en: "Join the Club", ms: "Sertai Kelab" },
    "Every visit earns you rewards": { zh: "每次到店都有奖励", en: "Every visit earns you rewards", ms: "Setiap kunjungan memberi ganjaran" },
    "Full Name": { zh: "姓名", en: "Full Name", ms: "Nama Penuh" },
    "Phone Number": { zh: "手机号", en: "Phone Number", ms: "Nombor Telefon" },
    "Create My Card": { zh: "创建我的卡", en: "Create My Card", ms: "Cipta Kad Saya" },
    "By joining you agree to receive updates from this business": { zh: "加入即表示同意接收本商家的消息", en: "By joining you agree to receive updates from this business", ms: "Dengan menyertai anda bersetuju menerima kemas kini dari perniagaan ini" },
    "Stamps": { zh: "印章", en: "Stamps", ms: "Setem" },
    "Rewards": { zh: "奖励", en: "Rewards", ms: "Ganjaran" },
    "History": { zh: "历史", en: "History", ms: "Sejarah" },
    "My QR": { zh: "我的二维码", en: "My QR", ms: "QR Saya" },
    "Current Card": { zh: "当前卡", en: "Current Card", ms: "Kad Semasa" },
    "How it works": { zh: "使用说明", en: "How it works", ms: "Cara guna" },
    "Show your QR code or give your phone number to staff after each visit to earn stamps. Collect enough stamps to redeem rewards!": { zh: "每次到店向店员出示二维码或报手机号即可集章,集满即可兑换奖励!", en: "Show your QR code or give your phone number to staff after each visit to earn stamps. Collect enough stamps to redeem rewards!", ms: "Tunjukkan kod QR atau berikan nombor telefon kepada staf setiap kunjungan untuk kumpul setem. Kumpul setem yang cukup untuk tebus ganjaran!" },
    "Show this to staff after every visit": { zh: "每次到店向店员出示", en: "Show this to staff after every visit", ms: "Tunjukkan ini kepada staf setiap kunjungan" },
    "Confirm Redemption": { zh: "确认兑换", en: "Confirm Redemption", ms: "Sahkan Penebusan" },
    "Show this screen to staff to complete your redemption.": { zh: "向店员出示此页面以完成兑换。", en: "Show this screen to staff to complete your redemption.", ms: "Tunjukkan skrin ini kepada staf untuk tebus ganjaran." },
    "Install to Home Screen": { zh: "添加到主屏幕", en: "Install to Home Screen", ms: "Pasang ke Skrin Utama" },
    "Add to Home Screen": { zh: "添加到主屏幕", en: "Add to Home Screen", ms: "Tambah ke Skrin Utama" },
    "Access your card anytime without opening a browser": { zh: "无需打开浏览器,随时查看你的卡", en: "Access your card anytime without opening a browser", ms: "Akses kad anda bila-bila masa tanpa buka pelayar" },
    "Install": { zh: "安装", en: "Install", ms: "Pasang" },
    "Points": { zh: "积分", en: "Points", ms: "Mata" },
    "Free": { zh: "免费", en: "Free", ms: "Percuma" },
    "Enable notifications": { zh: "开启通知", en: "Enable notifications", ms: "Hidupkan pemberitahuan" },
    "Get notified when stamps are added and rewards are ready": { zh: "集章和奖励到账时通知你", en: "Get notified when stamps are added and rewards are ready", ms: "Terima pemberitahuan apabila setem ditambah dan ganjaran sedia" },
    "Enable": { zh: "开启", en: "Enable", ms: "Hidupkan" },
    "Check the link and try again.": { zh: "请检查链接后重试。", en: "Check the link and try again.", ms: "Semak pautan dan cuba lagi." },
    "Search name or phone...": { zh: "搜索姓名或手机...", en: "Search name or phone...", ms: "Cari nama atau telefon..." },

    // ── CARD OTP 验证 ──
    "请输入有效手机号": { zh: "请输入有效手机号", en: "Please enter a valid phone number", ms: "Sila masukkan nombor telefon yang sah" },
    "发送中...": { zh: "发送中...", en: "Sending...", ms: "Menghantar..." },
    "发送失败": { zh: "发送失败", en: "Send failed", ms: "Gagal hantar" },
    "网络错误": { zh: "网络错误", en: "Network error", ms: "Ralat rangkaian" },
    "获取验证码": { zh: "获取验证码", en: "Get OTP", ms: "Dapatkan OTP" },
    "请输入完整 6 位验证码": { zh: "请输入完整 6 位验证码", en: "Please enter the full 6-digit code", ms: "Sila masukkan kod 6 digit penuh" },
    "验证中...": { zh: "验证中...", en: "Verifying...", ms: "Mengesahkan..." },
    "验证失败": { zh: "验证失败", en: "Verification failed", ms: "Pengesahan gagal" },
    "验证": { zh: "验证", en: "Verify", ms: "Sahkan" },
    "注册中...": { zh: "注册中...", en: "Registering...", ms: "Mendaftar..." },
    "注册失败": { zh: "注册失败", en: "Registration failed", ms: "Pendaftaran gagal" },
    "请输入姓名": { zh: "请输入姓名", en: "Please enter your name", ms: "Sila masukkan nama anda" },
    "完成注册": { zh: "完成注册", en: "Complete Registration", ms: "Selesai Pendaftaran" },
    "重新发送验证码": { zh: "重新发送验证码", en: "Resend code", ms: "Hantar semula kod" },
    "验证码已重新发送": { zh: "验证码已重新发送", en: "Code resent", ms: "Kod dihantar semula" },
    "Redeem": { zh: "兑换", en: "Redeem", ms: "Tebus" },
    "Locked": { zh: "未解锁", en: "Locked", ms: "Dikunci" },
    "Redeemed! Show to staff.": { zh: "已兑换! 请向店员出示。", en: "Redeemed! Show to staff.", ms: "Ditebus! Tunjukkan kepada staf." },
    "Error - please try again": { zh: "出错了,请重试", en: "Error - please try again", ms: "Ralat - sila cuba lagi" },
    "No activity yet. Visit us to earn your first stamp!": { zh: "暂无动态。来店里赚取你的第一个印章吧!", en: "No activity yet. Visit us to earn your first stamp!", ms: "Belum ada aktiviti. Kunjungi kami untuk kumpul setem pertama!" },
    "Notifications blocked": { zh: "通知已被阻止", en: "Notifications blocked", ms: "Pemberitahuan disekat" },
    "Notifications enabled!": { zh: "通知已开启!", en: "Notifications enabled!", ms: "Pemberitahuan dihidupkan!" },
    "Could not enable notifications": { zh: "无法开启通知", en: "Could not enable notifications", ms: "Tidak dapat hidupkan pemberitahuan" },
    "Card": { zh: "卡", en: "Card", ms: "Kad" },

    // ── CARD iOS PWA ──
    "Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>": { zh: "点击 <strong>分享</strong> 然后 <strong>添加到主屏幕</strong>", en: "Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>", ms: "Tekan <strong>Kongsi</strong> kemudian <strong>Tambah ke Skrin Utama</strong>" },

    // ── BOTTLE 存酒卡 ──
    "Bottles": { zh: "存酒", en: "Bottles", ms: "Botol" },
    "存酒清单": { zh: "存酒清单", en: "My Bottles", ms: "Botol Saya" },
    "我的券": { zh: "我的券", en: "My Vouchers", ms: "Baucar Saya" },
    "您暂无存酒": { zh: "您暂无存酒", en: "You have no bottles yet", ms: "Anda belum ada botol" },
    "请联系吧台登记": { zh: "请联系吧台登记", en: "Please ask the bar to register one", ms: "Sila minta bar untuk mendaftar" },
    "您暂无储值券": { zh: "您暂无储值券", en: "You have no vouchers", ms: "Anda belum ada baucar" },
    "请先注册会员": { zh: "请先注册会员", en: "Please register first", ms: "Sila daftar dahulu" },
    "先在会员卡页面登记手机号,即可查看您的存酒": { zh: "先在会员卡页面登记手机号,即可查看您的存酒", en: "Register your phone on the member card page to view your bottles", ms: "Daftar telefon di halaman kad ahli untuk lihat botol anda" },
    "去会员卡注册": { zh: "去会员卡注册", en: "Go to member card", ms: "Pergi ke kad ahli" },
    "请检查链接": { zh: "请检查链接", en: "Check the link", ms: "Semak pautan" },
    "Bottle Keep · 存酒": { zh: "存酒 Bottle Keep", en: "Bottle Keep", ms: "Simpanan Botol" },
    "流水": { zh: "流水", en: "History", ms: "Sejarah" },
    "暂无记录": { zh: "暂无记录", en: "No records", ms: "Tiada rekod" },
    "已过期": { zh: "已过期", en: "Expired", ms: "Tamat tempoh" },
    "加载失败": { zh: "加载失败", en: "Load failed", ms: "Gagal memuat" },
    "加载存酒失败": { zh: "加载存酒失败", en: "Failed to load bottles", ms: "Gagal memuat botol" },
    "days left": { zh: "天后到期", en: "days left", ms: "hari lagi" },
    "存入": { zh: "存入", en: "Deposit", ms: "Simpan" },
    "倒酒": { zh: "倒酒", en: "Pour", ms: "Tuang" },
    "总": { zh: "总", en: "of", ms: "dari" },
    "暂无存酒": { zh: "暂无存酒", en: "No bottles", ms: "Tiada botol" },
    "暂无储值券": { zh: "暂无储值券", en: "No vouchers", ms: "Tiada baucar" },

    // ── STAFF 员工 ──
    "Enter your PIN to continue": { zh: "输入 PIN 继续", en: "Enter your PIN to continue", ms: "Masukkan PIN untuk teruskan" },
    "Members": { zh: "会员", en: "Members", ms: "Ahli" },
    "Dashboard": { zh: "仪表盘", en: "Dashboard", ms: "Papan Pemuka" },
    "存酒": { zh: "存酒", en: "Bottle Keep", ms: "Simpanan Botol" },
    "Scan QR": { zh: "扫码", en: "Scan QR", ms: "Imbas QR" },
    "Add Stamp": { zh: "盖章", en: "Add Stamp", ms: "Tambah Setem" },
    "Confirm Stamp": { zh: "确认盖章", en: "Confirm Stamp", ms: "Sahkan Setem" },
    "Today": { zh: "今日", en: "Today", ms: "Hari Ini" },
    "This Week": { zh: "本周", en: "This Week", ms: "Minggu Ini" },
    "Redemptions": { zh: "兑换次数", en: "Redemptions", ms: "Penebusan" },
    "Recent Activity": { zh: "最近动态", en: "Recent Activity", ms: "Aktiviti Terkini" },
    "stamps": { zh: "印章", en: "stamps", ms: "setem" },
    "this week": { zh: "本周", en: "this week", ms: "minggu ini" },
    "SCAN MEMBER QR": { zh: "扫描会员二维码", en: "SCAN MEMBER QR", ms: "IMBAS QR AHLI" },
    "Point camera at member's QR code": { zh: "将摄像头对准会员二维码", en: "Point camera at member's QR code", ms: "Halakan kamera ke kod QR ahli" },
    "Incorrect PIN": { zh: "PIN 错误", en: "Incorrect PIN", ms: "PIN salah" },
    "搜索会员开始登记存酒 / 扣量": { zh: "搜索会员开始登记存酒 / 扣量", en: "Search a member to deposit / pour", ms: "Cari ahli untuk simpan / tuang" },
    "无匹配会员": { zh: "无匹配会员", en: "No matching member", ms: "Tiada ahli sepadan" },
    "登记新存酒": { zh: "登记新存酒", en: "New Bottle", ms: "Botol Baharu" },
    "该会员存酒": { zh: "该会员存酒", en: "Member's Bottles", ms: "Botol Ahli" },
    "登记存酒": { zh: "登记存酒", en: "Deposit", ms: "Simpan" },
    "扣量": { zh: "扣量", en: "Pour", ms: "Tuang" },
    "发储值券": { zh: "发储值券", en: "Issue Voucher", ms: "Keluarkan Baucar" },
    "发券": { zh: "发券", en: "Issue", ms: "Keluarkan" },
    "该会员券": { zh: "该会员券", en: "Member's Vouchers", ms: "Baucar Ahli" },
    "暂无券": { zh: "暂无券", en: "No vouchers", ms: "Tiada baucar" },
    "使用": { zh: "使用", en: "Redeem", ms: "Tebus" },
    "次卡(按次)": { zh: "次卡(按次)", en: "Sessions (by count)", ms: "Sesi (mengikut kiraan)" },
    "储值(按金额)": { zh: "储值(按金额)", en: "Credit (by amount)", ms: "Kredit (mengikut amaun)" },
    "请输入扣量": { zh: "请输入扣量", en: "Enter pour amount", ms: "Masukkan jumlah tuang" },
    "请填品牌和容量": { zh: "请填品牌和容量", en: "Enter brand and size", ms: "Masukkan jenama dan saiz" },
    "存酒已登记": { zh: "存酒已登记", en: "Bottle registered", ms: "Botol didaftarkan" },
    "扣量失败": { zh: "扣量失败", en: "Pour failed", ms: "Tuang gagal" },
    "登记失败": { zh: "登记失败", en: "Register failed", ms: "Pendaftaran gagal" },
    "请输入使用量": { zh: "请输入使用量", en: "Enter amount", ms: "Masukkan jumlah" },
    "已使用": { zh: "已使用", en: "Redeemed", ms: "Ditebus" },
    "使用失败": { zh: "使用失败", en: "Redeem failed", ms: "Penebusan gagal" },
    "请输入总量": { zh: "请输入总量", en: "Enter total", ms: "Masukkan jumlah" },
    "券已发放": { zh: "券已发放", en: "Voucher issued", ms: "Baucar dikeluarkan" },
    "发券失败": { zh: "发券失败", en: "Issue failed", ms: "Gagal mengeluarkan" },
    "剩余酒量不足": { zh: "剩余酒量不足", en: "Not enough remaining", ms: "Baki tidak mencukupi" },
    "余额不足": { zh: "余额不足", en: "Insufficient balance", ms: "Baki tidak mencukupi" },
    // placeholders (staff)
    "搜索会员姓名或手机...": { zh: "搜索会员姓名或手机...", en: "Search member name or phone...", ms: "Cari nama atau telefon ahli..." },
    "品牌 如 Hennessy XO": { zh: "品牌 如 Hennessy XO", en: "Brand e.g. Hennessy XO", ms: "Jenama cth. Hennessy XO" },
    "容量 ml": { zh: "容量 ml", en: "Size ml", ms: "Saiz ml" },
    "标签 如 10次套餐": { zh: "标签 如 10次套餐", en: "Label e.g. 10-session pack", ms: "Label cth. pakej 10 sesi" },
    "总次数 / 金额": { zh: "总次数 / 金额", en: "Total count / amount", ms: "Jumlah kiraan / amaun" },
    "次数": { zh: "次数", en: "Count", ms: "Kiraan" },
    "金额": { zh: "金额", en: "Amount", ms: "Amaun" },

    // ── DASHBOARD 商家后台 ──
    "Merchant Portal": { zh: "商家后台", en: "Merchant Portal", ms: "Portal Peniaga" },
    "Sign in to manage your loyalty program": { zh: "登录以管理你的会员计划", en: "Sign in to manage your loyalty program", ms: "Log masuk untuk urus program kesetiaan anda" },
    "Email": { zh: "邮箱", en: "Email", ms: "Emel" },
    "Password": { zh: "密码", en: "Password", ms: "Kata Laluan" },
    "Sign In": { zh: "登录", en: "Sign In", ms: "Log Masuk" },
    "New merchant? Create account": { zh: "新商家?创建账号", en: "New merchant? Create account", ms: "Peniaga baharu? Cipta akaun" },
    "Create Account": { zh: "创建账号", en: "Create Account", ms: "Cipta Akaun" },
    "Already have an account? Sign in": { zh: "已有账号?去登录", en: "Already have an account? Sign in", ms: "Sudah ada akaun? Log masuk" },
    "Sign out": { zh: "退出", en: "Sign out", ms: "Log Keluar" },
    "Setup Wizard": { zh: "设置向导", en: "Setup Wizard", ms: "Wizard Persediaan" },
    "Set up your loyalty program": { zh: "设置你的会员计划", en: "Set up your loyalty program", ms: "Sediakan program kesetiaan anda" },
    "Takes 2 minutes": { zh: "约需 2 分钟", en: "Takes 2 minutes", ms: "Ambil 2 minit" },
    "Business Info": { zh: "商家信息", en: "Business Info", ms: "Maklumat Perniagaan" },
    "Business Name": { zh: "商家名称", en: "Business Name", ms: "Nama Perniagaan" },
    "Card Design": { zh: "卡片设计", en: "Card Design", ms: "Reka Bentuk Kad" },
    "Brand Color": { zh: "品牌色", en: "Brand Color", ms: "Warna Jenama" },
    "Stamp Program": { zh: "印章方案", en: "Stamp Program", ms: "Program Setem" },
    "Stamps per card": { zh: "每卡印章数", en: "Stamps per card", ms: "Setem setiap kad" },
    "Reward Name": { zh: "奖励名称", en: "Reward Name", ms: "Nama Ganjaran" },
    "Services": { zh: "服务项目", en: "Services", ms: "Perkhidmatan" },
    "Staff PIN": { zh: "员工 PIN", en: "Staff PIN", ms: "PIN Staf" },
    "Launch My Loyalty Program": { zh: "启动我的会员计划", en: "Launch My Loyalty Program", ms: "Lancarkan Program Kesetiaan Saya" },
    "Your Links": { zh: "你的链接", en: "Your Links", ms: "Pautan Anda" },
    "Share these with customers and staff": { zh: "把这些分享给顾客和员工", en: "Share these with customers and staff", ms: "Kongsi ini dengan pelanggan dan staf" },
    "Member Card": { zh: "会员卡", en: "Member Card", ms: "Kad Ahli" },
    "Staff Panel": { zh: "员工面板", en: "Staff Panel", ms: "Panel Staf" },
    "Total Members": { zh: "会员总数", en: "Total Members", ms: "Jumlah Ahli" },
    "Stamps Today": { zh: "今日盖章", en: "Stamps Today", ms: "Setem Hari Ini" },
    "All Members": { zh: "所有会员", en: "All Members", ms: "Semua Ahli" },
    "Export CSV": { zh: "导出 CSV", en: "Export CSV", ms: "Eksport CSV" },
    "Name": { zh: "姓名", en: "Name", ms: "Nama" },
    "Phone": { zh: "手机", en: "Phone", ms: "Telefon" },
    "Tier": { zh: "等级", en: "Tier", ms: "Peringkat" },
    "Joined": { zh: "加入日期", en: "Joined", ms: "Tarikh Sertai" },
    "Marketing Notifications": { zh: "营销通知", en: "Marketing Notifications", ms: "Pemberitahuan Pemasaran" },
    "Send now, schedule for later, or auto win-back lapsed customers": { zh: "立即发送、定时发送,或自动挽回流失顾客", en: "Send now, schedule for later, or auto win-back lapsed customers", ms: "Hantar sekarang, jadualkan, atau tarik balik pelanggan lama" },
    "Send Now": { zh: "立即发送", en: "Send Now", ms: "Hantar Sekarang" },
    "Schedule": { zh: "定时", en: "Schedule", ms: "Jadual" },
    "Win-Back": { zh: "挽回", en: "Win-Back", ms: "Tarik Balik" },
    "Title": { zh: "标题", en: "Title", ms: "Tajuk" },
    "Message": { zh: "内容", en: "Message", ms: "Mesej" },
    "Send At": { zh: "发送时间", en: "Send At", ms: "Hantar Pada" },
    "Preview": { zh: "预览", en: "Preview", ms: "Pratonton" },
    "Scheduled & Recent": { zh: "定时与最近", en: "Scheduled & Recent", ms: "Berjadual & Terkini" },
    "No scheduled notifications": { zh: "暂无定时通知", en: "No scheduled notifications", ms: "Tiada pemberitahuan berjadual" },
    "Branches / Locations": { zh: "门店 / 地点", en: "Branches / Locations", ms: "Cawangan / Lokasi" },
    "No activity yet": { zh: "暂无动态", en: "No activity yet", ms: "Belum ada aktiviti" },
    "酒窖 Bottle Keep": { zh: "酒窖 Bottle Keep", en: "Cellar · Bottle Keep", ms: "Simpanan Botol" },
    "会员存酒管理与过期预警（按到期日排序）": { zh: "会员存酒管理与过期预警（按到期日排序）", en: "Member bottle management & expiry alerts (sorted by expiry)", ms: "Pengurusan botol ahli & amaran tamat tempoh (ikut tarikh)" },
    "存酒总瓶数": { zh: "存酒总瓶数", en: "Active Bottles", ms: "Botol Aktif" },
    "本周到期": { zh: "本周到期", en: "Expiring", ms: "Akan Tamat" },
    "已清空": { zh: "已清空", en: "Emptied", ms: "Dikosongkan" },
    "品牌": { zh: "品牌", en: "Brand", ms: "Jenama" },
    "剩余": { zh: "剩余", en: "Remaining", ms: "Baki" },
    "进度": { zh: "进度", en: "Progress", ms: "Kemajuan" },
    "到期": { zh: "到期", en: "Expiry", ms: "Tamat Tempoh" },
    "状态": { zh: "状态", en: "Status", ms: "Status" },
    "会员": { zh: "会员", en: "Member", ms: "Ahli" },
    "正常": { zh: "正常", en: "OK", ms: "OK" },
    "即将到期": { zh: "即将到期", en: "Expiring", ms: "Akan Tamat" },
    "无存酒": { zh: "无存酒", en: "No bottles", ms: "Tiada botol" },
    "功能开关 Features": { zh: "功能开关 Features", en: "Features", ms: "Ciri-ciri" },
    "开启 / 关闭本店的功能模块": { zh: "开启 / 关闭本店的功能模块", en: "Enable / disable feature modules", ms: "Hidupkan / matikan modul ciri" },
    "印章卡": { zh: "印章卡", en: "Stamp Card", ms: "Kad Setem" },
    "集印章换奖励": { zh: "集印章换奖励", en: "Collect stamps for rewards", ms: "Kumpul setem untuk ganjaran" },
    "存酒 Bottle Keep": { zh: "存酒 Bottle Keep", en: "Bottle Keep", ms: "Simpanan Botol" },
    "酒吧存酒 / 扣量": { zh: "酒吧存酒 / 扣量", en: "Bar bottle keep / pour", ms: "Simpan / tuang botol bar" },
    "储值券": { zh: "储值券", en: "Vouchers", ms: "Baucar" },
    "次卡 / 储值卡": { zh: "次卡 / 储值卡", en: "Session / credit cards", ms: "Kad sesi / kredit" },
    "保存功能开关": { zh: "保存功能开关", en: "Save Features", ms: "Simpan Ciri" },
    "Branding 品牌设置": { zh: "品牌设置 Branding", en: "Branding", ms: "Penjenamaan" },
    "自定义会员卡颜色与 Logo（仅影响顾客会员卡，不影响 ChopKar 平台界面）": { zh: "自定义会员卡颜色与 Logo（仅影响顾客会员卡，不影响 ChopKar 平台界面）", en: "Customize card color & logo (affects the customer card only)", ms: "Sesuaikan warna kad & logo (hanya kad pelanggan)" },
    "Card Color 卡片主色": { zh: "卡片主色 Card Color", en: "Card Color", ms: "Warna Kad" },
    "Page Background 页面背景色": { zh: "页面背景色 Page Background", en: "Page Background", ms: "Latar Belakang" },
    "上传 Logo": { zh: "上传 Logo", en: "Upload Logo", ms: "Muat Naik Logo" },
    "保存品牌设置": { zh: "保存品牌设置", en: "Save Branding", ms: "Simpan Jenama" },
    "实时预览 Live Preview": { zh: "实时预览 Live Preview", en: "Live Preview", ms: "Pratonton Langsung" },
    "恢复自动": { zh: "恢复自动", en: "Auto", ms: "Auto" },
    "ChopKar 平台界面颜色不受此影响": { zh: "ChopKar 平台界面颜色不受此影响", en: "ChopKar platform colors are unaffected", ms: "Warna platform ChopKar tidak terjejas" },
    "功能开关已保存！": { zh: "功能开关已保存！", en: "Features saved!", ms: "Ciri disimpan!" },
    "品牌设置已保存！": { zh: "品牌设置已保存！", en: "Branding saved!", ms: "Jenama disimpan!" },
    "保存失败": { zh: "保存失败", en: "Save failed", ms: "Gagal menyimpan" },
    "Link copied!": { zh: "链接已复制!", en: "Link copied!", ms: "Pautan disalin!" },
    "CSV downloaded!": { zh: "CSV 已下载!", en: "CSV downloaded!", ms: "CSV dimuat turun!" },
    "顾客会员卡页面背景": { zh: "顾客会员卡页面背景", en: "Customer card page background", ms: "Latar belakang halaman kad pelanggan" },
    // dashboard placeholders
    "搜索会员 / 品牌 / 手机...": { zh: "搜索会员 / 品牌 / 手机...", en: "Search member / brand / phone...", ms: "Cari ahli / jenama / telefon..." },
    "you@business.com": { zh: "you@business.com", en: "you@business.com", ms: "anda@perniagaan.com" },

    // ── OTP 验证页面 ──
    "Your Name 姓名": { zh: "姓名", en: "Your Name", ms: "Nama Anda" },
    "Enter the 6-digit code sent to": { zh: "输入发送到以下号码的 6 位验证码", en: "Enter the 6-digit code sent to", ms: "Masukkan kod 6 digit yang dihantar ke" },
    "Resend code": { zh: "重新发送验证码", en: "Resend code", ms: "Hantar semula kod" },
    "新老会员均可直接登录": { zh: "新老会员均可直接登录", en: "New and existing members can log in directly", ms: "Ahli baharu dan sedia ada boleh log masuk terus" },
    "输入验证码": { zh: "输入验证码", en: "Enter verification code", ms: "Masukkan kod pengesahan" },
    "验证码已发送至": { zh: "验证码已发送至", en: "Verification code sent to", ms: "Kod pengesahan dihantar ke" },
    "欢迎加入！": { zh: "欢迎加入！", en: "Welcome!", ms: "Selamat datang!" },
    "请输入您的姓名完成注册，开始集章之旅": { zh: "请输入您的姓名完成注册，开始集章之旅", en: "Enter your name to complete registration and start collecting stamps", ms: "Masukkan nama anda untuk selesaikan pendaftaran dan mula kumpul setem" }
  };

  var LANGS = ['zh', 'en', 'ms'];
  var LABELS = { zh: '中', en: 'EN', ms: 'BM' };

  function detect() {
    var s; try { s = localStorage.getItem('chopkar_lang'); } catch (e) {}
    if (LANGS.indexOf(s) !== -1) return s;
    var n = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (n.indexOf('zh') === 0) return 'zh';
    if (n.indexOf('ms') === 0 || n.indexOf('id') === 0) return 'ms';
    return 'en';
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
    document.documentElement.lang = LANG === 'zh' ? 'zh' : LANG === 'ms' ? 'ms' : 'en';
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
    if (LANGS.indexOf(l) === -1 || l === LANG) return;
    LANG = l; try { localStorage.setItem('chopkar_lang', l); } catch (e) {}
    applyLang();
    try { window.dispatchEvent(new Event('ck-langchange')); } catch (e) {}
  };

  function nextLang() {
    var idx = LANGS.indexOf(LANG);
    return LANGS[(idx + 1) % LANGS.length];
  }

  function updateBtn() { var b = document.getElementById('ck-lang'); if (b) b.textContent = LABELS[nextLang()]; }
  function makeBtn() {
    if (document.getElementById('ck-lang')) return;
    var b = document.createElement('button');
    b.id = 'ck-lang'; b.type = 'button'; b.setAttribute('aria-label', 'Switch language');
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:90;background:rgba(0,0,0,0.55);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:7px 14px;font:500 13px system-ui,-apple-system,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,0.28);line-height:1';
    b.onclick = function () { window.setLang(nextLang()); };
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
