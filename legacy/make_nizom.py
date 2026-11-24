"""BARAKA LES nizomi (loyiha) va lavozim yo'riqnomalari: Tugun uchun boshlang'ich matn."""

T0 = "2026-11-10T06:00:00.000Z"

NIZOM_SECTIONS = [
    ("Umumiy qoidalar", """BARAKA LES Urganch shahrida taxta, yog'och mahsulotlari, profnastil va mixning ulgurji va chakana savdosi bilan shug'ullanadi.

Kompaniya uch tarmoqdan iborat:
- B2C: do'kon va call-markaz orqali xususiy mijozlarga savdo.
- B2B: qurilish tashkilotlari, ustalar va do'konlarga ulgurji savdo.
- B2G: davlat buyurtmalari va tenderlar.

Bu nizom har bir xodim uchun umumiy ish tartibini belgilaydi. U mehnat shartnomasi va O'zbekiston Respublikasi Mehnat kodeksini almashtirmaydi, ularni to'ldiradi."""),
    ("Maqsad va qadriyatlar", """Bizning maqsadimiz: mijoz kerakli mahsulotni to'g'ri o'lchamda, aytilgan narxda va va'da qilingan vaqtda olishi.

Qadriyatlarimiz:
- Halol o'lchov. Hajm, son va sifat hujjatda qanday yozilsa, mijozga shunday topshiriladi.
- Va'daga vafo. Muddatni bajara olmasang, mijozga va mas'ulga oldindan ayt.
- Bir jamoa. Bo'limlar raqobatchi emas: umumiy ishda har kim o'z qismini vaqtida topshiradi.
- Tartib. Har bir pul, mahsulot va hujjat harakati qayd etiladi."""),
    ("Tashkiliy tuzilma va «Tugun usuli»", """Kompaniyani ta'sischi boshqaradi. Uch tarmoqni umumiy boshqaruv menejeri muvofiqlashtiradi. Har bir tarmoq bo'limlardan, har bir bo'lim xodimlardan iborat.

Ish tartibi uchta qoidaga tayanadi:
1. Har bir xodimning bitta uyi bor: uning bo'limi. Ish vaqti, davomat va bo'lim boshlig'i shu bo'limdan keladi.
2. Bir nechta bo'lim birga bajaradigan ish tugun deyiladi va Tugun dasturida task sifatida yuritiladi.
3. Har bir tugunning bitta egasi bor: mas'ul. Ijrochilar ko'p bo'lishi mumkin, natija uchun javobgar esa bitta."""),
    ("Ish vaqti va davomat", """Ish vaqti har bir bo'lim uchun Tugun dasturida belgilangan. Belgilangan vaqtdan 5 daqiqagacha kechikish hisobga olinmaydi.

- Xodim kelganda va ketganda kirishdagi terminalda shaxsiy PIN kodini teradi.
- PIN kodni boshqa odamga berish yoki boshqa xodim o'rniga belgilash taqiqlanadi.
- Terminalda belgilash unutilsa, vaqtni faqat bo'lim boshlig'i yoki rahbar sabab ko'rsatib tuzatadi. Har bir tuzatish tarixda saqlanadi.
- Kelolmaslik yoki kechikish haqida bo'lim boshlig'iga ish boshlanishidan oldin xabar beriladi."""),
    ("Vazifalar va javobgarlik", """- Har bir vazifa Tugun'da task sifatida ochiladi: nomi, bo'limlari, mas'uli va muddati bilan.
- Mas'ul task holatini va bajarilish foizini kamida haftasiga bir marta yangilaydi.
- Muddatni bajarib bo'lmasa, mas'ul muddat tugashidan oldin sababini izohda yozadi va rahbar bilan yangi muddatni kelishadi.
- Ish bo'yicha yozishmalar va fayllar taskning izohlar va fayllar qismida saqlanadi, shaxsiy chatlarda qolib ketmaydi.
- Bajarilgan ish «Tekshiruvda» holatiga o'tkaziladi, topshiruvchi tekshirgach «Bajarildi» qilinadi."""),
    ("Mijozlar bilan ishlash", """- Mijozga narx faqat amaldagi narxnoma bo'yicha aytiladi. Chegirmani bo'lim boshlig'i tasdiqlaydi.
- Har bir sotuv hujjat bilan rasmiylashtiriladi: chek, yuk xati yoki shartnoma.
- Mahsulot mijozga topshirilishidan oldin hajmi va soni mijoz ishtirokida tekshiriladi.
- Mijoz shikoyati 24 soat ichida ko'rib chiqiladi va javob beriladi.
- Mijoz bilan muomala hurmatli bo'ladi: tovush ko'tarish va bahslashish taqiqlanadi."""),
    ("Moliyaviy intizom va hisobot", """- Naqd pul faqat kassa orqali qabul qilinadi va o'sha kuni kirim qilinadi.
- Har bir chiqim hujjat bilan tasdiqlanadi.
- Oylik hisobot hujjatlari keyingi oyning 5-sanasigacha buxgalteriyaga (Full Contact) topshiriladi.
- Ombordagi mahsulot qoldig'i har oy oxirida sanoqdan o'tkaziladi, farq bo'lsa dalolatnoma tuziladi."""),
    ("Mol-mulk, xavfsizlik va maxfiylik", """- Yuk ortish va tushirishda himoya qo'lqopi va poyabzal kiyish majburiy.
- Taxta stellajlarda belgilangan balandlikdan oshirib taxlanmaydi.
- Ombor va hududda chekish va ochiq olovdan foydalanish taqiqlanadi.
- Kompaniya texnikasi va transportidan faqat ish uchun foydalaniladi.
- Narxlar, mijozlar bazasi va shartnomalar maxfiy ma'lumot hisoblanadi va uchinchi shaxslarga berilmaydi."""),
    ("Rag'batlantirish va intizom", """Rag'batlantirish: oylik natija ko'rsatkichlari bajarilganda mukofot, yil yakunida eng yaxshi xodimlar taqdirlanadi. Mukofot miqdori va tartibini ta'sischi belgilaydi.

Nizom buzilganda Mehnat kodeksiga muvofiq choralar ko'riladi:
1. Og'zaki ogohlantirish.
2. Yozma ogohlantirish (hayfsan).
3. Takrorlansa, mehnat shartnomasida nazarda tutilgan boshqa choralar."""),
    ("Yakuniy qoidalar", """Nizom ta'sischi tasdiqlagan kundan kuchga kiradi. O'zgarishlar Tugun dasturida kiritiladi va har bir o'zgarishdan keyin xodimlar yangi tahrir bilan qayta tanishib, «Tanishdim» tugmasini bosadi.

Bu matn loyiha. Uni ta'sischi va kerak bo'lsa huquqshunos ko'rib chiqishi kerak."""),
]

def nizom_doc():
    secs = {}
    for i, (title, body) in enumerate(NIZOM_SECTIONS, 1):
        secs[f"s{i}"] = {"title": title, "body": body, "order": i}
    return {"title": "BARAKA LES ichki nizomi", "status": "Loyiha", "v": 1, "updatedAt": T0, "by": "rahbar", "sections": secs}

L = lambda s: [x.strip() for x in s.strip().split("\n") if x.strip()]

POSITIONS = {
    "p-b2b-head": dict(title="B2B savdo bo'limi boshlig'i", deptId="b2b-sales", reportsTo="Umumiy boshqaruv menejeri",
        summary="Ulgurji mijozlar bilan savdo rejasini bajaradi va B2B savdo menejerlari ishini boshqaradi.",
        duties=L("""Oylik savdo rejasini tuzish va bajarilishini nazorat qilish
Yirik mijozlar (qurilish tashkilotlari, do'konlar) bilan shartnomalarni yuritish
Ulgurji narx va chegirmalarni rahbar bilan kelishish
Menejerlar ishini taqsimlash va haftalik yig'ilish o'tkazish
Debitor qarzdorlikni nazorat qilish
Ta'minot bilan buyurtmalar hajmini oldindan kelishish"""),
        daily=L("""09:00 menejerlar bilan qisqa yig'ilish
Kun davomida yirik mijozlar bilan aloqa
17:30 kunlik savdo va to'lovlarni tekshirish"""),
        kpi=L("""Oylik savdo rejasining bajarilishi
Muddati o'tgan debitor qarz ulushi
Qaytgan mijozlar soni"""),
        rights=L("""Belgilangan chegaradagi chegirmani tasdiqlash
Menejerlarga vazifa berish va baholash"""),
        firstWeek=L("""Narxnoma, assortiment va omborni o'rganish
Asosiy 20 ta B2B mijoz bilan tanishish
Debitor qarzlar ro'yxatini qabul qilib olish
Tugun'da bo'lim tasklarini ko'rib chiqish""")),
    "p-b2b-manager": dict(title="B2B savdo menejeri", deptId="b2b-sales", reportsTo="B2B savdo bo'limi boshlig'i",
        summary="Ulgurji mijozlarni topadi, buyurtma qabul qiladi va to'lovni oxirigacha kuzatadi.",
        duties=L("""Yangi ulgurji mijozlarni topish va uchrashuvlar o'tkazish
Buyurtmani qabul qilish, hisob-faktura va shartnoma tayyorlash
Yetkazib berishni logist bilan kelishish
To'lovlarni kuzatish va eslatish
Mijozlar bazasini CRM da to'liq yuritish"""),
        daily=L("""Kuniga kamida 15 ta qo'ng'iroq yoki uchrashuv
Buyurtmalarni o'sha kuni rasmiylashtirish
Kun oxirida CRM ni yangilash"""),
        kpi=L("""Shaxsiy savdo rejasi
Yangi mijozlar soni
O'z vaqtida to'langan buyurtmalar ulushi"""),
        rights=L("""Narxnoma bo'yicha narx aytish
Bo'lim boshlig'i ruxsati bilan chegirma taklif qilish"""),
        firstWeek=L("""Mahsulot turlari va o'lchamlarini o'rganish
Narxnoma va chegirma qoidalarini o'rganish
Tajribali menejer bilan 3 ta uchrashuvda qatnashish
CRM va Tugun'dan foydalanishni o'rganish""")),
    "p-supply-head": dict(title="Ta'minot bo'limi boshlig'i", deptId="b2b-supplies", reportsTo="Umumiy boshqaruv menejeri",
        summary="Mahsulot zaxirasi yetarli bo'lishini va yetkazib beruvchilardan o'z vaqtida kelishini ta'minlaydi.",
        duties=L("""Zaxira qoldig'iga qarab xarid rejasini tuzish
Yetkazib beruvchilar bilan narx va muddatni kelishish
Kelgan yukni sifat va hajm bo'yicha qabul qilishni tashkil etish
Logist va omborchi ishini boshqarish
Oylik qoldiq sanog'ini o'tkazish"""),
        daily=L("""Ertalab ombor qoldig'ini tekshirish
Kun davomida yetkazib beruvchilar bilan aloqa
Kechqurun ertangi yetkazishlar rejasini tasdiqlash"""),
        kpi=L("""Kerakli mahsulot omborda yo'qligi sababli rad etilgan buyurtmalar soni
Xarid narxining bozor narxiga nisbati
Sanoqdagi farq"""),
        rights=L("""Tasdiqlangan byudjet doirasida xarid buyurtmasi berish
Sifatsiz yukni qabul qilmaslik"""),
        firstWeek=L("""Yetkazib beruvchilar ro'yxati va shartnomalarni o'rganish
Ombor qoldig'ini qabul qilib olish
Oxirgi 3 oylik xaridlar tahlili""")),
    "p-logist": dict(title="Logist", deptId="b2b-supplies", reportsTo="Ta'minot bo'limi boshlig'i",
        summary="Mahsulotni mijozga va omborga o'z vaqtida, eng arzon yo'l bilan yetkazishni rejalashtiradi.",
        duties=L("""Yetkazib berish jadvalini tuzish
Transport va haydovchilarni taqsimlash
Yuk xatlari va yo'l hujjatlarini tayyorlash
Mijozga yetkazish vaqtini oldindan xabar qilish
Transport xarajatlarini hisobga olish"""),
        daily=L("""08:30 kunlik reyslar rejasini tasdiqlash
Reyslar holatini kuzatish
Kechqurun ertangi rejani tuzish"""),
        kpi=L("""O'z vaqtida yetkazilgan buyurtmalar ulushi
Bir reys xarajati"""),
        rights=L("""Reyslar navbatini o'zgartirish
Hujjatsiz yukni jo'natmaslik"""),
        firstWeek=L("""Transport va haydovchilar bilan tanishish
Asosiy yo'nalishlar va masofalarni o'rganish
Yuk xati to'ldirishni o'rganish""")),
    "p-omborchi": dict(title="Omborchi", deptId="b2b-supplies", reportsTo="Ta'minot bo'limi boshlig'i",
        summary="Ombordagi mahsulotni qabul qiladi, saqlaydi va hujjat asosida beradi.",
        duties=L("""Kelgan yukni hujjat bilan solishtirib qabul qilish
Mahsulotni o'lcham va nav bo'yicha taxlash
Faqat hujjat asosida mahsulot berish
Kunlik kirim-chiqimni qayd etish
Oylik sanoqda qatnashish"""),
        daily=L("""Ombor ochilishida tartib va xavfsizlikni tekshirish
Kirim va chiqimlarni o'sha zahoti qayd etish
Kun oxirida qoldiqni solishtirish"""),
        kpi=L("""Sanoqdagi farq
Yukni berishga ketgan o'rtacha vaqt"""),
        rights=L("""Hujjatsiz mahsulot bermaslik
Shikastlangan yukni dalolatnoma bilan qabul qilish"""),
        firstWeek=L("""Ombor xaritasi va taxlash tartibini o'rganish
Mahsulot navlari va o'lchamlarini farqlashni o'rganish
Xavfsizlik yo'riqnomasidan o'tish""")),
    "p-brigadir": dict(title="Brigadir", deptId="b2b-bluecoll", reportsTo="Ta'minot bo'limi boshlig'i",
        summary="Yuk ortish-tushirish brigadasini boshqaradi va xavfsizlik qoidalariga rioya qilinishini ta'minlaydi.",
        duties=L("""Brigadaga kunlik ish taqsimlash
Yuk ortish va tushirishni tez va xavfsiz tashkil etish
Himoya vositalaridan foydalanishni nazorat qilish
Asbob va texnikaning sozligini tekshirish
Shikastlangan mahsulot haqida darhol xabar berish"""),
        daily=L("""Ish boshida brigadani yig'ib vazifa berish
Har bir reysni ortishdan oldin tekshirish
Kun oxirida bajarilgan ishlarni qayd etish"""),
        kpi=L("""Reysni ortishga ketgan vaqt
Shikastlangan mahsulot miqdori
Xavfsizlik buzilishlari soni (nol bo'lishi kerak)"""),
        rights=L("""Xavfli ishni to'xtatish
Ishchilarni joyidan almashtirish"""),
        firstWeek=L("""Xavfsizlik yo'riqnomasidan o'tish
Ombor va yuk maydonini o'rganish
Brigada a'zolari bilan tanishish""")),
    "p-usta": dict(title="Yuk ortuvchi usta", deptId="b2b-bluecoll", reportsTo="Brigadir",
        summary="Mahsulotni ortadi, tushiradi va omborda tartib bilan taxlaydi.",
        duties=L("""Yukni ehtiyotkorlik bilan ortish va tushirish
Taxtani nav va o'lcham bo'yicha taxlash
Himoya vositalaridan foydalanish
Ish joyini toza saqlash"""),
        daily=L("""Brigadir bergan reyslarni bajarish
Ish oxirida asboblarni joyiga qo'yish"""),
        kpi=L("""Shikastlangan mahsulot miqdori
O'z vaqtida tayyorlangan reyslar"""),
        rights=L("""Xavfli vaziyatda ishni to'xtatish va brigadirga aytish"""),
        firstWeek=L("""Xavfsizlik yo'riqnomasidan o'tish
Mahsulot navlarini farqlashni o'rganish
Tajribali usta bilan birga ishlash""")),
    "p-pr-head": dict(title="PR bo'limi boshlig'i", deptId="b2b-pr", reportsTo="Umumiy boshqaruv menejeri",
        summary="Kompaniya nomini taniqli qiladi va savdoga mijoz oqimini olib keladi.",
        duties=L("""Oylik marketing rejasi va byudjetini tuzish
Reklama kampaniyalarini boshqarish
Ustalar keshbek dasturi va aksiyalarni yuritish
SMM va dizayn ishini nazorat qilish
Reklama natijasini savdo bilan birga tahlil qilish"""),
        daily=L("""Kanallar statistikasini tekshirish
Jamoa bilan kontent rejasini kelishish"""),
        kpi=L("""Reklamadan kelgan murojaatlar soni
Bir murojaat narxi
Ustalar dasturidagi faol ishtirokchilar soni"""),
        rights=L("""Tasdiqlangan byudjet doirasida reklama berish"""),
        firstWeek=L("""Brend materiallari va kanallar bilan tanishish
Oxirgi kampaniyalar natijasini o'rganish
Savdo bo'limlari bilan uchrashuv""")),
    "p-smm": dict(title="SMM mutaxassisi", deptId="b2b-pr", reportsTo="PR bo'limi boshlig'i",
        summary="Telegram, Instagram va YouTube sahifalarini yuritadi.",
        duties=L("""Kontent reja asosida post va qisqa videolar tayyorlash
Izoh va xabarlarga javob berish yoki operatorga yo'naltirish
Statistikani haftalik hisobot qilish
Mahsulot va narx ma'lumotlari to'g'riligini savdo bilan tekshirish"""),
        daily=L("""Kuniga kamida 1 ta post yoki video
Xabarlarga 1 soat ichida javob"""),
        kpi=L("""Obunachilar o'sishi
Sahifadan kelgan murojaatlar soni"""),
        rights=L("""Kontent rejasidagi postlarni mustaqil chop etish"""),
        firstWeek=L("""Brend uslubi va ovozini o'rganish
Sahifalarga kirish huquqini olish
Birinchi haftalik kontent rejasini tuzish""")),
    "p-dizayner": dict(title="Dizayner", deptId="b2b-pr", reportsTo="PR bo'limi boshlig'i",
        summary="Reklama, narxnoma va ijtimoiy tarmoqlar uchun dizayn tayyorlaydi.",
        duties=L("""Post, banner va narxnoma dizaynini tayyorlash
Brend uslubiga rioya qilish
Taqdimot va katalog tayyorlash"""),
        daily=L("""Tugun'dagi dizayn tasklarini navbat bilan bajarish"""),
        kpi=L("""O'z vaqtida topshirilgan ishlar ulushi
Tuzatishlar soni"""),
        rights=L("""Brend uslubi doirasida yechim tanlash"""),
        firstWeek=L("""Logotip, ranglar va shriftlarni o'rganish
Oldingi materiallar bilan tanishish""")),
    "p-b2g-head": dict(title="B2G bo'limi boshlig'i", deptId="b2b-b2g", reportsTo="Umumiy boshqaruv menejeri",
        summary="Davlat buyurtmalari va tenderlar orqali yangi savdo yo'nalishini quradi.",
        duties=L("""Davlat xaridlari portallarini kuzatish
Tenderda qatnashish bo'yicha qaror tayyorlash
Hujjatlar to'plamini o'z vaqtida topshirishni tashkil etish
Yutilgan shartnomalar bajarilishini nazorat qilish"""),
        daily=L("""Yangi e'lonlarni ko'rib chiqish
Tayyorlanayotgan tenderlar muddatini tekshirish"""),
        kpi=L("""Qatnashilgan va yutilgan tenderlar soni
Shartnomalarning o'z vaqtida bajarilishi"""),
        rights=L("""Tender narxini rahbar bilan kelishib taklif qilish"""),
        firstWeek=L("""Davlat xaridlari qonunchiligini o'rganish
Portallarda kompaniya kabinetini sozlash
Ta'minot va savdo bilan tannarxni hisoblash""")),
    "p-tender": dict(title="Tender mutaxassisi", deptId="b2b-b2g", reportsTo="B2G bo'limi boshlig'i",
        summary="Tender hujjatlarini tayyorlaydi va muddatida topshiradi.",
        duties=L("""Tender shartlarini o'rganish
Texnik va moliyaviy hujjatlarni tayyorlash
Hujjatlarni portalga yuklash
Natijalarni kuzatish"""),
        daily=L("""Tender muddatlari jadvalini yangilash"""),
        kpi=L("""Xatosiz qabul qilingan hujjatlar ulushi
Muddati o'tkazib yuborilgan tenderlar soni (nol bo'lishi kerak)"""),
        rights=L("""Boshqa bo'limlardan kerakli ma'lumotni so'rash"""),
        firstWeek=L("""Namuna tender hujjatlarini o'rganish
Portalda ishlashni o'rganish""")),
    "p-yurist": dict(title="Huquqshunos", deptId="b2b-b2g", reportsTo="Umumiy boshqaruv menejeri",
        summary="Shartnomalar va tender hujjatlarining huquqiy to'g'riligini ta'minlaydi.",
        duties=L("""Shartnoma loyihalarini tayyorlash va tekshirish
Tender hujjatlarini huquqiy ko'rib chiqish
Debitor qarzlar bo'yicha talabnoma tayyorlash
Ichki hujjatlar va nizomga huquqiy xulosa berish"""),
        daily=L("""Kelgan shartnomalarni 1 ish kunida ko'rib chiqish"""),
        kpi=L("""Shartnomani ko'rib chiqish muddati
Huquqiy nizolar soni"""),
        rights=L("""Xavfli shartlarni imzolashni to'xtatish tavsiyasi"""),
        firstWeek=L("""Amaldagi shartnoma namunalari bilan tanishish
Nizom loyihasini ko'rib chiqish""")),
    "p-op-senior": dict(title="Katta operator", deptId="b2c-operators", reportsTo="B2C savdo boshlig'i",
        summary="Call-markaz ishini tashkil etadi va operatorlar sifatini nazorat qiladi.",
        duties=L("""Operatorlar jadvalini tuzish
Qo'ng'iroqlar skriptini yangilab borish
Murakkab murojaatlarni o'zi hal qilish
Operatorlar suhbatini tinglab baholash"""),
        daily=L("""Ertalab kechagi o'tkazib yuborilgan qo'ng'iroqlarni taqsimlash
Kun oxirida qo'ng'iroqlar statistikasini tekshirish"""),
        kpi=L("""Javobsiz qolgan qo'ng'iroqlar ulushi
Qo'ng'iroqdan buyurtmaga o'tish ulushi"""),
        rights=L("""Operatorlarga vazifa berish"""),
        firstWeek=L("""Skript va narxnomani o'rganish
Operatorlar bilan tanishish""")),
    "p-operator": dict(title="Call-markaz operatori", deptId="b2c-operators", reportsTo="Katta operator",
        summary="Mijoz qo'ng'iroqlariga javob beradi, buyurtma qabul qiladi va savdoga uzatadi.",
        duties=L("""Kiruvchi qo'ng'iroqlarga 3 jiringlashgacha javob berish
Skript bo'yicha mahsulot va narx haqida ma'lumot berish
Buyurtmani CRM ga to'liq kiritish
O'tkazib yuborilgan qo'ng'iroqlarga qayta qo'ng'iroq qilish"""),
        daily=L("""Smena boshida narxnoma yangiliklarini ko'rish
O'tkazib yuborilganlarga 30 daqiqa ichida qayta qo'ng'iroq"""),
        kpi=L("""Qabul qilingan qo'ng'iroqlar soni
Buyurtmaga aylangan qo'ng'iroqlar ulushi"""),
        rights=L("""Narxnoma bo'yicha narx aytish"""),
        firstWeek=L("""Skript va mahsulotlarni o'rganish
Katta operator bilan birga qo'ng'iroqlar tinglash
CRM ga buyurtma kiritishni o'rganish""")),
    "p-b2c-head": dict(title="B2C savdo boshlig'i", deptId="b2c-sales", reportsTo="Umumiy boshqaruv menejeri",
        summary="Do'kon va call-markaz orqali chakana savdo rejasini bajaradi.",
        duties=L("""Chakana savdo rejasini tuzish va nazorat qilish
Do'kon savdo menejerlari va call-markaz ishini muvofiqlashtirish
Narxnoma va aksiyalarni PR bilan kelishish
Mijoz shikoyatlarini hal qilish"""),
        daily=L("""Ertalab kunlik reja bo'yicha yig'ilish
Kechqurun savdo va kassani tekshirish"""),
        kpi=L("""Oylik chakana savdo rejasi
O'rtacha chek
Shikoyatlar soni"""),
        rights=L("""Belgilangan chegaradagi chegirmani tasdiqlash"""),
        firstWeek=L("""Do'kon va kassa tartibini o'rganish
Jamoa bilan tanishish
Oxirgi 3 oylik savdo tahlili""")),
    "p-b2c-manager": dict(title="Do'kon savdo menejeri", deptId="b2c-sales", reportsTo="B2C savdo boshlig'i",
        summary="Do'konga kelgan mijozga maslahat beradi va sotuvni rasmiylashtiradi.",
        duties=L("""Mijozga mahsulot tanlashda yordam berish
Kerakli hajmni hisoblab berish
Sotuvni kassa va hujjat orqali rasmiylashtirish
Yetkazib berishni logistga uzatish"""),
        daily=L("""Do'kon ochilishida namuna va narx yorliqlarini tekshirish
Kun oxirida savdoni kassaga solishtirish"""),
        kpi=L("""Shaxsiy savdo hajmi
O'rtacha chek"""),
        rights=L("""Narxnoma bo'yicha sotish"""),
        firstWeek=L("""Mahsulot turlari va hisoblash usullarini o'rganish
Kassa dasturini o'rganish""")),
    "p-works-head": dict(title="Ish boshqaruvchisi", deptId="b2c-works", reportsTo="Umumiy boshqaruv menejeri",
        summary="Obyektlardagi ishlarni rejalashtiradi va muddatida topshiradi.",
        duties=L("""Obyekt ishlari jadvalini tuzish
Muhandis, smeta va ishchilar ishini muvofiqlashtirish
Material ehtiyojini ta'minotga oldindan berish
Ish sifati va xavfsizligini nazorat qilish"""),
        daily=L("""Ertalab obyektlar bo'yicha vazifa taqsimlash
Kun oxirida bajarilgan ishlarni Tugun'da yangilash"""),
        kpi=L("""Obyektlarning o'z vaqtida topshirilishi
Smetadan oshgan xarajat"""),
        rights=L("""Ishchilarni obyektlar o'rtasida taqsimlash"""),
        firstWeek=L("""Joriy obyektlarni ko'zdan kechirish
Smeta va jadvallarni qabul qilib olish""")),
    "p-muhandis": dict(title="Muhandis", deptId="b2c-works", reportsTo="Ish boshqaruvchisi",
        summary="Obyektdagi ishlarning texnik to'g'riligini ta'minlaydi.",
        duties=L("""Texnik yechim va chizmalarni tayyorlash
Ish jarayonini texnik nazorat qilish
Material sarfini hisoblash"""),
        daily=L("""Obyektda ish sifatini tekshirish"""),
        kpi=L("""Qayta bajarilgan ishlar soni"""),
        rights=L("""Texnik talabga javob bermaydigan ishni to'xtatish"""),
        firstWeek=L("""Joriy obyektlar loyihalarini o'rganish""")),
    "p-smeta": dict(title="Smeta mutaxassisi", deptId="b2c-works", reportsTo="Ish boshqaruvchisi",
        summary="Ish va materiallar narxini hisoblab, mijoz bilan smetani kelishadi.",
        duties=L("""Material va ish hajmi bo'yicha smeta tuzish
Smetani mijoz bilan kelishish
Haqiqiy xarajatni smeta bilan solishtirish"""),
        daily=L("""Yangi so'rovlarga 1 ish kunida smeta tayyorlash"""),
        kpi=L("""Smeta va haqiqiy xarajat farqi
Smeta tayyorlash muddati"""),
        rights=L("""Narxnoma asosida smeta narxini belgilash"""),
        firstWeek=L("""Narxnoma va oldingi smetalarni o'rganish""")),
    "p-ishchi": dict(title="Ishchi", deptId="b2c-worker", reportsTo="Ish boshqaruvchisi",
        summary="Obyektdagi ishlarni texnologiya va xavfsizlik qoidalariga rioya qilib bajaradi.",
        duties=L("""Berilgan ishni sifatli va muddatida bajarish
Himoya vositalaridan foydalanish
Asbob va materialni ehtiyot qilish
Muammo bo'lsa darhol ish boshqaruvchisiga aytish"""),
        daily=L("""Ish boshida vazifani olish
Ish oxirida ish joyini tartibga keltirish"""),
        kpi=L("""Bajarilgan ish hajmi
Qayta bajarilgan ishlar soni"""),
        rights=L("""Xavfli ishni bajarishdan bosh tortish"""),
        firstWeek=L("""Xavfsizlik yo'riqnomasidan o'tish
Tajribali ishchi bilan birga ishlash""")),
}

STAFF_POS = {
    "b2b-sales-1": "p-b2b-head", "b2b-sales-2": "p-b2b-manager", "b2b-sales-3": "p-b2b-manager",
    "b2b-supplies-1": "p-supply-head", "b2b-supplies-2": "p-logist", "b2b-supplies-3": "p-omborchi",
    "b2b-bluecoll-1": "p-brigadir", "b2b-bluecoll-2": "p-usta", "b2b-bluecoll-3": "p-usta",
    "b2b-pr-1": "p-pr-head", "b2b-pr-2": "p-smm", "b2b-pr-3": "p-dizayner",
    "b2b-b2g-1": "p-b2g-head", "b2b-b2g-2": "p-tender", "b2b-b2g-3": "p-yurist",
    "b2c-operators-1": "p-op-senior", "b2c-operators-2": "p-operator", "b2c-operators-3": "p-operator",
    "b2c-sales-1": "p-b2c-head", "b2c-sales-2": "p-b2c-manager", "b2c-sales-3": "p-b2c-manager",
    "b2c-works-1": "p-works-head", "b2c-works-2": "p-muhandis", "b2c-works-3": "p-smeta",
    "b2c-worker-1": "p-ishchi", "b2c-worker-2": "p-ishchi", "b2c-worker-3": "p-ishchi",
}

def positions_doc():
    pos = {}
    for i, (pid, p) in enumerate(POSITIONS.items(), 1):
        pos[pid] = {**p, "order": i, "v": 1, "updatedAt": T0}
    return {"pos": pos}

# who already confirmed (demo): most heads and some staff; two have not read the position yet
ACKED_NIZOM = ["b2b-sales-1", "b2b-sales-2", "b2b-supplies-1", "b2b-supplies-2", "b2b-supplies-3", "b2b-bluecoll-1", "b2b-pr-1", "b2b-pr-2",
               "b2b-b2g-1", "b2b-b2g-2", "b2c-operators-1", "b2c-operators-2", "b2c-sales-1", "b2c-sales-2", "b2c-works-1", "b2c-works-2", "b2c-worker-1"]
NOT_POS = {"b2b-pr-2", "b2c-worker-1"}

def demo_acks():
    out = {}
    for i, sid in enumerate(ACKED_NIZOM):
        t = f"2026-11-{10 if i % 3 else 9:02d}T0{5 + i % 4}:{(i * 7) % 60:02d}:00.000Z"
        a = {"staffId": sid, "demo": True, "nizom": {"v": 1, "t": t}}
        if sid not in NOT_POS:
            a["pos"] = {"id": STAFF_POS[sid], "v": 1, "t": t}
        out[f"acks/demo-{sid}"] = a
    return out
