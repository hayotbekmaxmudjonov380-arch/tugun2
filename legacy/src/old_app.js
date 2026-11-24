(() => {
"use strict";

/* ================= constants ================= */
const MONTHS = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
const WD = ["Ya","Du","Se","Ch","Pa","Ju","Sh"];
const WD_LONG = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
const WD_ORDER = [1,2,3,4,5,6,0];
const STATE_LABEL = { new: "Yangi", progress: "Jarayonda", review: "Tekshiruvda", done: "Bajarildi", overdue: "Muddati o'tgan" };
const EDIT_STATUSES = ["new","progress","review","done"];
const VIEWS = ["tuzilma","dashboard","tasklar","davomat","sozlamalar","qollanma"];
const ORG_PATH = "org/structure";
/* Namuna (sinab ko'rish) ma'lumotlari: faqat baza ishlamaganda yoki ko'rish huquqi bo'lganda, shu oynaning xotirasida ishlatiladi. */
const DEMO_BASE = "2026-11-10";
const DEMO = {"org/structure":{"branches":{"b2b":{"name":"B2B","order":1},"b2c":{"name":"B2C","order":2}},"departments":{"b2b-sales":{"name":"Sales","branch":"b2b","order":1,"workStart":"09:00","workEnd":"18:00"},"b2b-supplies":{"name":"Supplies","branch":"b2b","order":2,"workStart":"09:00","workEnd":"18:00"},"b2b-bluecoll":{"name":"Blue coll.","branch":"b2b","order":3,"workStart":"08:00","workEnd":"17:00"},"b2b-pr":{"name":"PR","branch":"b2b","order":4,"workStart":"09:00","workEnd":"18:00"},"b2b-b2g":{"name":"B2G","branch":"b2b","order":5,"workStart":"09:00","workEnd":"18:00"},"b2c-operators":{"name":"operators","branch":"b2c","order":1,"workStart":"09:00","workEnd":"18:00"},"b2c-sales":{"name":"Sales","branch":"b2c","order":2,"workStart":"09:00","workEnd":"18:00"},"b2c-works":{"name":"works","branch":"b2c","order":3,"workStart":"08:00","workEnd":"17:00"},"b2c-worker":{"name":"worker","branch":"b2c","order":4,"workStart":"08:00","workEnd":"17:00"}},"staff":{"b2b-sales-1":{"name":"Aziz Karimov","role":"Bo'lim rahbari","deptId":"b2b-sales","order":1,"phone":"","demo":true},"b2b-sales-2":{"name":"Dilnoza Yusupova","role":"Savdo menejeri","deptId":"b2b-sales","order":2,"phone":"","demo":true},"b2b-sales-3":{"name":"Sardor Rahimov","role":"Savdo menejeri","deptId":"b2b-sales","order":3,"phone":"","demo":true},"b2b-supplies-1":{"name":"Jasur Toshmatov","role":"Ta'minot rahbari","deptId":"b2b-supplies","order":1,"phone":"","demo":true},"b2b-supplies-2":{"name":"Malika Ergasheva","role":"Logist","deptId":"b2b-supplies","order":2,"phone":"","demo":true},"b2b-supplies-3":{"name":"Bekzod Qodirov","role":"Omborchi","deptId":"b2b-supplies","order":3,"phone":"","demo":true},"b2b-bluecoll-1":{"name":"Rustam Xolmatov","role":"Brigadir","deptId":"b2b-bluecoll","order":1,"phone":"","demo":true},"b2b-bluecoll-2":{"name":"Anvar Sobirov","role":"Usta","deptId":"b2b-bluecoll","order":2,"phone":"","demo":true},"b2b-bluecoll-3":{"name":"Shoxrux Nazarov","role":"Usta","deptId":"b2b-bluecoll","order":3,"phone":"","demo":true},"b2b-pr-1":{"name":"Nigora Alimova","role":"PR rahbari","deptId":"b2b-pr","order":1,"phone":"","demo":true},"b2b-pr-2":{"name":"Kamola Saidova","role":"SMM mutaxassisi","deptId":"b2b-pr","order":2,"phone":"","demo":true},"b2b-pr-3":{"name":"Otabek Mirzayev","role":"Dizayner","deptId":"b2b-pr","order":3,"phone":"","demo":true},"b2b-b2g-1":{"name":"Farhod Umarov","role":"B2G rahbari","deptId":"b2b-b2g","order":1,"phone":"","demo":true},"b2b-b2g-2":{"name":"Zarina Hasanova","role":"Tender mutaxassisi","deptId":"b2b-b2g","order":2,"phone":"","demo":true},"b2b-b2g-3":{"name":"Ulug'bek Jo'rayev","role":"Huquqshunos","deptId":"b2b-b2g","order":3,"phone":"","demo":true},"b2c-operators-1":{"name":"Madina Rasulova","role":"Katta operator","deptId":"b2c-operators","order":1,"phone":"","demo":true},"b2c-operators-2":{"name":"Shahzoda Nurmatova","role":"Operator","deptId":"b2c-operators","order":2,"phone":"","demo":true},"b2c-operators-3":{"name":"Javohir Ismoilov","role":"Operator","deptId":"b2c-operators","order":3,"phone":"","demo":true},"b2c-sales-1":{"name":"Behruz Abdullayev","role":"Savdo rahbari","deptId":"b2c-sales","order":1,"phone":"","demo":true},"b2c-sales-2":{"name":"Gulnoza Tursunova","role":"Menejer","deptId":"b2c-sales","order":2,"phone":"","demo":true},"b2c-sales-3":{"name":"Islom Fayziyev","role":"Menejer","deptId":"b2c-sales","order":3,"phone":"","demo":true},"b2c-works-1":{"name":"Doniyor Qosimov","role":"Ish boshqaruvchisi","deptId":"b2c-works","order":1,"phone":"","demo":true},"b2c-works-2":{"name":"Sherzod Ahmedov","role":"Muhandis","deptId":"b2c-works","order":2,"phone":"","demo":true},"b2c-works-3":{"name":"Laylo Yo'ldosheva","role":"Smeta mutaxassisi","deptId":"b2c-works","order":3,"phone":"","demo":true},"b2c-worker-1":{"name":"Akmal Yoqubov","role":"Ishchi","deptId":"b2c-worker","order":1,"phone":"","demo":true},"b2c-worker-2":{"name":"Sanjar Hamidov","role":"Ishchi","deptId":"b2c-worker","order":2,"phone":"","demo":true},"b2c-worker-3":{"name":"Mansur Rajabov","role":"Ishchi","deptId":"b2c-worker","order":3,"phone":"","demo":true}},"settings":{"grace":5,"workDays":[1,2,3,4,5]}},"attendance/2026-11":{"month":"2026-11","days":{"2026-11-02":{"b2b-sales-1":{"in":"09:04","out":"18:29"},"b2b-sales-2":{"in":"08:56","out":"18:36"},"b2b-sales-3":{"in":"09:16","out":"18:31"},"b2b-supplies-1":{"in":"08:41","out":"18:22"},"b2b-supplies-2":{"in":"08:59","out":"18:36"},"b2b-bluecoll-1":{"in":"08:13","out":"17:35"},"b2b-bluecoll-3":{"in":"07:46","out":"17:37"},"b2b-pr-1":{"in":"09:09","out":"18:14"},"b2b-pr-2":{"in":"08:42","out":"18:17"},"b2b-pr-3":{"in":"08:40","out":"18:03"},"b2b-b2g-1":{"in":"08:52","out":"17:25"},"b2b-b2g-2":{"in":"09:13","out":"18:00"},"b2b-b2g-3":{"in":"08:52","out":"18:33"},"b2c-operators-1":{"in":"08:48","out":"18:16"},"b2c-operators-2":{"in":"09:04","out":"18:05"},"b2c-operators-3":{"in":"09:08","out":"18:28"},"b2c-sales-1":{"in":"08:54","out":"18:43"},"b2c-sales-2":{"in":"08:52","out":"18:23"},"b2c-sales-3":{"in":"09:25","out":"17:58"},"b2c-works-1":{"in":"07:59","out":"17:03"},"b2c-works-3":{"in":"07:40","out":"17:18"},"b2c-worker-1":{"in":"07:42","out":"17:34"},"b2c-worker-2":{"in":"08:18","out":"17:26"},"b2c-worker-3":{"in":"07:58","out":"17:21"}},"2026-11-03":{"b2b-sales-1":{"in":"08:47","out":"18:12"},"b2b-sales-2":{"in":"09:00","out":"18:09"},"b2b-sales-3":{"in":"08:55","out":"18:23"},"b2b-supplies-2":{"in":"08:48","out":"18:42"},"b2b-supplies-3":{"in":"08:59","out":"18:30"},"b2b-bluecoll-1":{"in":"07:42","out":"17:27"},"b2b-bluecoll-2":{"in":"07:59","out":"17:10"},"b2b-bluecoll-3":{"in":"07:40","out":"16:38"},"b2b-pr-1":{"in":"09:12","out":"18:30"},"b2b-pr-2":{"in":"08:51","out":"18:25"},"b2b-pr-3":{"in":"09:02","out":"18:05"},"b2b-b2g-1":{"in":"08:55","out":"18:41"},"b2b-b2g-2":{"in":"09:09","out":"18:43"},"b2b-b2g-3":{"in":"08:42","out":"18:31"},"b2c-operators-1":{"in":"09:11","out":"18:18"},"b2c-operators-2":{"in":"08:42","out":"18:23"},"b2c-operators-3":{"in":"09:22","out":"18:36"},"b2c-sales-1":{"in":"08:40","out":"18:02"},"b2c-sales-2":{"in":"09:15","out":"18:43"},"b2c-sales-3":{"in":"09:02","out":"18:25"},"b2c-works-1":{"in":"07:56","out":"16:58"},"b2c-works-2":{"in":"08:07","out":"17:41"},"b2c-works-3":{"in":"08:01","out":"17:13"},"b2c-worker-1":{"in":"07:44","out":"17:09"},"b2c-worker-2":{"in":"07:50","out":"17:25"},"b2c-worker-3":{"in":"07:52","out":"17:09"}},"2026-11-04":{"b2b-sales-1":{"in":"09:04","out":"18:10"},"b2b-sales-2":{"in":"08:50","out":"18:05"},"b2b-sales-3":{"in":"08:41","out":"18:14"},"b2b-supplies-1":{"in":"09:22","out":"18:10"},"b2b-supplies-2":{"in":"08:56","out":"18:17"},"b2b-supplies-3":{"in":"08:59","out":"18:01"},"b2b-bluecoll-1":{"in":"07:59","out":"16:47"},"b2b-bluecoll-2":{"in":"08:00","out":"16:58"},"b2b-bluecoll-3":{"in":"07:46","out":"16:51"},"b2b-pr-1":{"in":"08:41","out":"18:04"},"b2b-pr-2":{"in":"09:00","out":"18:20"},"b2b-pr-3":{"in":"08:46","out":"18:13"},"b2b-b2g-1":{"in":"09:22","out":"17:59"},"b2b-b2g-2":{"in":"08:51","out":"18:30"},"b2b-b2g-3":{"in":"08:45","out":"18:41"},"b2c-operators-1":{"in":"09:19","out":"18:26"},"b2c-operators-2":{"in":"08:40","out":"18:33"},"b2c-operators-3":{"in":"08:50","out":"18:38"},"b2c-sales-1":{"in":"09:10","out":"18:21"},"b2c-sales-2":{"in":"08:57","out":"18:17"},"b2c-sales-3":{"in":"08:40","out":"18:02"},"b2c-works-2":{"in":"07:48","out":"16:58"},"b2c-works-3":{"in":"07:53","out":"17:08"},"b2c-worker-1":{"in":"07:44","out":"17:30"},"b2c-worker-2":{"in":"08:01","out":"17:28"},"b2c-worker-3":{"in":"08:04","out":"17:30"}},"2026-11-05":{"b2b-sales-1":{"in":"08:57","out":"18:30"},"b2b-sales-2":{"in":"08:48","out":"18:21"},"b2b-sales-3":{"in":"08:59","out":"18:06"},"b2b-supplies-1":{"in":"08:58","out":"18:23"},"b2b-supplies-2":{"in":"08:59","out":"18:31"},"b2b-supplies-3":{"in":"08:52","out":"18:33"},"b2b-bluecoll-1":{"in":"08:12","out":"16:42"},"b2b-bluecoll-2":{"in":"07:52","out":"17:27"},"b2b-bluecoll-3":{"in":"07:55","out":"17:03"},"b2b-pr-1":{"in":"08:48","out":"17:58"},"b2b-pr-3":{"in":"09:16","out":"18:19"},"b2b-b2g-1":{"in":"08:55","out":"18:04"},"b2b-b2g-2":{"in":"09:02","out":"18:30"},"b2b-b2g-3":{"in":"09:20","out":"18:36"},"b2c-operators-1":{"in":"09:00","out":"18:10"},"b2c-operators-2":{"in":"08:59","out":"18:05"},"b2c-operators-3":{"in":"08:51","out":"18:17"},"b2c-sales-1":{"in":"08:46","out":"18:09"},"b2c-sales-2":{"in":"08:47","out":"18:02"},"b2c-sales-3":{"in":"09:20","out":"18:42"},"b2c-works-1":{"in":"08:01","out":"17:03"},"b2c-works-2":{"in":"07:51","out":"17:29"},"b2c-works-3":{"in":"08:01","out":"17:01"},"b2c-worker-1":{"in":"08:24","out":"17:33"},"b2c-worker-2":{"in":"07:43","out":"17:07"},"b2c-worker-3":{"in":"07:43","out":"17:05"}},"2026-11-06":{"b2b-sales-1":{"in":"09:04","out":"18:22"},"b2b-sales-2":{"in":"08:53","out":"18:20"},"b2b-supplies-1":{"in":"08:45","out":"18:20"},"b2b-supplies-2":{"in":"08:46","out":"18:03"},"b2b-supplies-3":{"in":"09:09","out":"18:42"},"b2b-bluecoll-1":{"in":"07:52","out":"17:09"},"b2b-bluecoll-2":{"in":"08:04","out":"17:04"},"b2b-bluecoll-3":{"in":"07:52","out":"17:18"},"b2b-pr-1":{"in":"09:04","out":"18:08"},"b2b-pr-2":{"in":"08:42","out":"18:16"},"b2b-pr-3":{"in":"09:18","out":"18:36"},"b2b-b2g-2":{"in":"08:49","out":"18:39"},"b2b-b2g-3":{"in":"08:42","out":"18:28"},"b2c-operators-1":{"in":"09:04","out":"18:33"},"b2c-operators-3":{"in":"08:48","out":"18:29"},"b2c-sales-1":{"in":"08:52","out":"17:33"},"b2c-sales-2":{"in":"08:57","out":"18:23"},"b2c-sales-3":{"in":"08:43","out":"18:38"},"b2c-works-1":{"in":"08:04","out":"17:21"},"b2c-works-2":{"in":"07:55","out":"17:28"},"b2c-works-3":{"in":"07:53","out":"17:23"},"b2c-worker-1":{"in":"07:49","out":"17:15"},"b2c-worker-2":{"in":"07:49","out":"17:44"},"b2c-worker-3":{"in":"08:14","out":"17:37"}},"2026-11-09":{"b2b-sales-1":{"in":"08:52","out":"17:35"},"b2b-sales-2":{"in":"09:17","out":"18:11"},"b2b-sales-3":{"in":"09:04","out":"18:30"},"b2b-supplies-1":{"in":"08:54","out":"18:12"},"b2b-supplies-2":{"in":"09:20","out":"18:10"},"b2b-supplies-3":{"in":"08:44","out":"18:25"},"b2b-bluecoll-1":{"in":"07:59","out":"17:34"},"b2b-bluecoll-2":{"in":"08:03","out":"17:05"},"b2b-bluecoll-3":{"in":"07:47","out":"17:29"},"b2b-pr-1":{"in":"08:59","out":"18:14"},"b2b-pr-2":{"in":"08:58","out":"18:09"},"b2b-pr-3":{"in":"08:46","out":"18:29"},"b2b-b2g-1":{"in":"09:01","out":"17:26"},"b2b-b2g-3":{"in":"09:08","out":"18:31"},"b2c-operators-1":{"in":"09:01","out":"18:12"},"b2c-operators-2":{"in":"08:55","out":"18:18"},"b2c-operators-3":{"in":"08:42","out":"18:25"},"b2c-sales-1":{"in":"09:04","out":"18:25"},"b2c-sales-2":{"in":"08:44","out":"18:38"},"b2c-sales-3":{"in":"08:49","out":"18:44"},"b2c-works-1":{"in":"08:00","out":"17:03"},"b2c-works-2":{"in":"07:57","out":"17:33"},"b2c-works-3":{"in":"07:54","out":"16:57"},"b2c-worker-1":{"in":"08:01","out":"17:41"},"b2c-worker-2":{"in":"08:02","out":"17:06"},"b2c-worker-3":{"in":"07:50","out":"17:04"}},"2026-11-10":{"b2b-sales-1":{"in":"08:52"},"b2b-sales-2":{"in":"09:04"},"b2b-sales-3":{"in":"09:17"},"b2b-supplies-1":{"in":"08:56"},"b2b-supplies-2":{"in":"09:00"},"b2b-supplies-3":{"in":"09:09"},"b2b-bluecoll-1":{"in":"08:01"},"b2b-bluecoll-2":{"in":"08:03"},"b2b-bluecoll-3":{"in":"07:50"},"b2b-pr-1":{"in":"08:56"},"b2b-pr-3":{"in":"08:58"},"b2b-b2g-1":{"in":"08:51"},"b2b-b2g-2":{"in":"08:56"},"b2b-b2g-3":{"in":"08:52"},"b2c-operators-1":{"in":"08:49"},"b2c-operators-2":{"in":"08:54"},"b2c-sales-1":{"in":"08:58"},"b2c-sales-2":{"in":"08:49"},"b2c-sales-3":{"in":"08:44"},"b2c-works-1":{"in":"07:53"},"b2c-works-2":{"in":"08:12"},"b2c-works-3":{"in":"07:53"},"b2c-worker-1":{"in":"07:42"},"b2c-worker-2":{"in":"07:53"}}},"demo":true},"tasks/t-tender":{"title":"Davlat tenderi hujjatlarini topshirish","desc":"Qurilish tenderi uchun texnik va moliyaviy hujjatlar to'plami.","deptIds":["b2b-b2g","b2b-sales","b2b-supplies"],"staffIds":["b2b-b2g-1","b2b-b2g-2","b2b-sales-1","b2b-supplies-2"],"start":"2026-11-03","due":"2026-11-14","status":"progress","progress":60,"createdAt":"2026-11-03T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-material":{"title":"2-obyektga materiallar yetkazish","desc":"Sement, armatura va g'isht: 3 ta reys.","deptIds":["b2b-supplies","b2b-bluecoll","b2c-works"],"staffIds":["b2b-supplies-1","b2b-supplies-3","b2b-bluecoll-1","b2c-works-1"],"start":"2026-11-05","due":"2026-11-12","status":"progress","progress":70,"createdAt":"2026-11-05T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-reklama":{"title":"Noyabr reklama kampaniyasi","desc":"Ijtimoiy tarmoqlar, banner va qo'ng'iroqlar orqali yangi mijozlarni jalb qilish.","deptIds":["b2b-pr","b2c-operators","b2c-sales"],"staffIds":["b2b-pr-1","b2b-pr-2","b2b-pr-3","b2c-operators-1","b2c-sales-2"],"start":"2026-11-01","due":"2026-11-30","status":"progress","progress":35,"createdAt":"2026-11-01T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-skript":{"title":"Qo'ng'iroqlar skriptini yangilash","desc":"Operatorlar uchun yangi narxlar va aksiyalar bo'yicha suhbat skripti.","deptIds":["b2c-operators","b2c-sales"],"staffIds":["b2c-operators-1","b2c-operators-2","b2c-sales-1"],"start":"2026-11-03","due":"2026-11-08","status":"review","progress":90,"createdAt":"2026-11-03T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-tom":{"title":"Obyektda tom yopish ishlari","desc":"1-uy tomini yopish va issiqlik izolyatsiyasi.","deptIds":["b2c-works","b2c-worker","b2b-bluecoll"],"staffIds":["b2c-worker-1","b2c-worker-2","b2c-works-2","b2b-bluecoll-2","b2b-bluecoll-3"],"start":"2026-11-06","due":"2026-11-20","status":"progress","progress":40,"createdAt":"2026-11-06T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-xavfsizlik":{"title":"Xavfsizlik bo'yicha yo'riqnoma","desc":"Balandlikda ishlash qoidalari bo'yicha amaliy mashg'ulot.","deptIds":["b2c-worker","b2b-bluecoll"],"staffIds":["b2c-worker-3","b2b-bluecoll-1"],"start":"2026-11-12","due":"2026-11-13","status":"new","progress":0,"createdAt":"2026-11-12T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-taqdimot":{"title":"Hamkor kompaniyalarga taqdimot","desc":"Korporativ mijozlar uchun xizmatlar taqdimoti.","deptIds":["b2b-sales","b2b-pr"],"staffIds":["b2b-sales-1","b2b-sales-2","b2b-pr-3"],"start":"2026-10-28","due":"2026-11-07","status":"done","progress":100,"createdAt":"2026-10-28T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"2026-11-06","demo":true},"tasks/t-crm":{"title":"Mijozlar bazasini tartibga solish","desc":"Oxirgi 6 oydagi murojaatlarni CRM ga kiritish.","deptIds":["b2c-sales","b2c-operators"],"staffIds":["b2c-sales-2","b2c-sales-3","b2c-operators-3"],"start":"2026-11-09","due":"2026-11-16","status":"progress","progress":20,"createdAt":"2026-11-09T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true},"tasks/t-smeta":{"title":"Smeta va narxlarni kelishish","desc":"2-obyekt uchun yakuniy smetani mijoz bilan kelishish.","deptIds":["b2c-works","b2c-sales","b2b-supplies"],"staffIds":["b2c-works-3","b2c-sales-1","b2b-supplies-1"],"start":"2026-11-10","due":"2026-11-17","status":"new","progress":0,"createdAt":"2026-11-10T09:00:00.000Z","updatedAt":"2026-11-10T08:00:00.000Z","doneAt":"","demo":true}};
const TEMPLATE = {
  branches: { b2b: { name: "B2B", order: 1 }, b2c: { name: "B2C", order: 2 } },
  departments: {
    "b2b-sales":     { name: "Sales",       branch: "b2b", order: 1, workStart: "09:00", workEnd: "18:00" },
    "b2b-supplies":  { name: "Supplies",    branch: "b2b", order: 2, workStart: "09:00", workEnd: "18:00" },
    "b2b-bluecoll":  { name: "Blue coll.",  branch: "b2b", order: 3, workStart: "08:00", workEnd: "17:00" },
    "b2b-pr":        { name: "PR",          branch: "b2b", order: 4, workStart: "09:00", workEnd: "18:00" },
    "b2b-b2g":       { name: "B2G",         branch: "b2b", order: 5, workStart: "09:00", workEnd: "18:00" },
    "b2c-operators": { name: "operators",   branch: "b2c", order: 1, workStart: "09:00", workEnd: "18:00" },
    "b2c-sales":     { name: "Sales",       branch: "b2c", order: 2, workStart: "09:00", workEnd: "18:00" },
    "b2c-works":     { name: "works",       branch: "b2c", order: 3, workStart: "08:00", workEnd: "17:00" },
    "b2c-worker":    { name: "worker",      branch: "b2c", order: 4, workStart: "08:00", workEnd: "17:00" }
  },
  settings: { grace: 5, workDays: [1,2,3,4,5] }
};

/* ================= state ================= */
const S = {
  org: { branches: {}, departments: {}, staff: {}, settings: {} },
  tasks: {},
  att: {},
  loaded: {}, errors: {},
  db: null, conn: "connecting", slow: false,
  canWrite: true, canAdmin: true,
  view: "tuzilma", deptId: null,
  focusTask: null,
  tf: { q: "", status: "all", dept: "all", mode: "table" },
  attDate: null, attMode: "day",
  doneOpen: false,
  openDept: null,
  dash: { branch: "all", month: null },
  monthSubs: {},
  lastMinute: ""
};

/* ================= small utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const parseYmd = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const monthOf = s => String(s).slice(0, 7);
const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const fmtDate = s => { if (!s) return "—"; const d = parseYmd(s); return `${d.getDate()}-${MONTHS[d.getMonth()]}`; };
const fmtMonth = m => { const [y, mm] = m.split("-").map(Number); return `${cap(MONTHS[mm - 1])} ${y}`; };
const toMin = hm => { if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const fromMin = m => m == null ? "" : `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
const fmtDur = min => { if (min == null || min < 0) return "—"; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} s ${pad(m)} daq` : `${m} daq`; };
const num = v => Number.isFinite(+v) ? +v : 0;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => (w[0] || "").toUpperCase()).join("") || "?";
const shortName = name => { const parts = String(name || "").trim().split(/\s+/); return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : (parts[0] || "?"); };
const normQ = s => String(s || "").toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
const iso = () => new Date().toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "bolim";
function normTime(v) {
  v = String(v || "").trim();
  if (!v) return "";
  let m = v.match(/^(\d{1,2})[:.\s-]?(\d{2})$/);
  if (!m && /^\d$/.test(v)) m = [v, v, "00"];
  if (!m && /^\d{3}$/.test(v)) m = [v, v.slice(0, 1), v.slice(1)];
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}

/* ================= data access ================= */
function cleanMap(m) { const o = {}; if (m && typeof m === "object") for (const [k, v] of Object.entries(m)) if (v && typeof v === "object") o[k] = v; return o; }
function normOrg(d) { d = d || {}; return { branches: cleanMap(d.branches), departments: cleanMap(d.departments), staff: cleanMap(d.staff), settings: (d.settings && typeof d.settings === "object") ? d.settings : {} }; }
const byOrder = (a, b) => (num(a.order) - num(b.order)) || String(a.name || "").localeCompare(String(b.name || ""));
function branches() { return Object.entries(S.org.branches).map(([id, b]) => ({ ...b, id })).sort(byOrder); }
function depts(branchId) { return Object.entries(S.org.departments).map(([id, d]) => ({ ...d, id })).filter(d => branchId == null || d.branch === branchId).sort(byOrder); }
function deptsOrdered() { const out = []; branches().forEach(b => out.push(...depts(b.id))); const seen = new Set(out.map(d => d.id)); depts().forEach(d => { if (!seen.has(d.id)) out.push(d); }); return out; }
function staffOf(deptId) { return Object.entries(S.org.staff).map(([id, p]) => ({ ...p, id })).filter(p => p.deptId === deptId).sort(byOrder); }
function allStaff() { return deptsOrdered().flatMap(d => staffOf(d.id)); }
function getDept(id) { const d = S.org.departments[id]; return d ? { ...d, id } : null; }
function getPerson(id) { const p = S.org.staff[id]; return p ? { ...p, id } : null; }
function branchName(id) { return S.org.branches[id]?.name || ""; }
function tasks() { return Object.entries(S.tasks).map(([id, t]) => ({ ...t, id })).filter(t => typeof t.title === "string"); }
function tDepts(t) { return (Array.isArray(t.deptIds) ? t.deptIds : []).map(getDept).filter(Boolean); }
function tStaff(t) { return (Array.isArray(t.staffIds) ? t.staffIds : []).map(getPerson).filter(Boolean); }
function hasDept(t, id) { return Array.isArray(t.deptIds) && t.deptIds.includes(id); }
function stateOf(t) { if (t.status === "done") return "done"; if (t.due && t.due < todayStr()) return "overdue"; return ["new","progress","review"].includes(t.status) ? t.status : "new"; }
function pct(t) { return t.status === "done" ? 100 : clamp(Math.round(num(t.progress)), 0, 100); }
const byDue = (a, b) => ((a.status === "done") - (b.status === "done")) || String(a.due || "9999").localeCompare(String(b.due || "9999")) || String(a.title).localeCompare(String(b.title));
function dueInfo(t) {
  if (t.status === "done") return { text: t.doneAt ? `${fmtDate(t.doneAt)} bajarildi` : "Bajarildi", cls: "ok" };
  if (!t.due) return { text: "Muddat yo'q", cls: "" };
  const d = diffDays(todayStr(), t.due);
  if (d < 0) return { text: `${-d} kun kechikdi`, cls: "crit" };
  if (d === 0) return { text: "Bugun tugaydi", cls: "warn" };
  if (d === 1) return { text: "Ertaga tugaydi", cls: "warn" };
  if (d <= 3) return { text: `${d} kun qoldi`, cls: "warn" };
  return { text: `${d} kun qoldi`, cls: "" };
}
function settings() {
  const s = S.org.settings || {};
  const grace = Number.isFinite(+s.grace) ? clamp(+s.grace, 0, 120) : 5;
  const workDays = Array.isArray(s.workDays) && s.workDays.length ? s.workDays.map(Number) : [1,2,3,4,5];
  return { grace, workDays };
}
function rec(date, pid) { const r = S.att[monthOf(date)]?.days?.[date]?.[pid]; return (r && typeof r === "object") ? r : null; }
function isWorkday(date) { return settings().workDays.includes(parseYmd(date).getDay()); }
function attInfo(p, date) {
  const d = getDept(p.deptId) || {};
  const ws = toMin(d.workStart) ?? 540, we = toMin(d.workEnd) ?? 1080;
  const r = rec(date, p.id); const i = toMin(r?.in), o = toMin(r?.out);
  const today = todayStr(), g = settings().grace;
  const base = { in: i == null ? "" : r.in, out: o == null ? "" : r.out, worked: null, late: 0, early: 0, live: false };
  if (i == null) {
    if (date > today) return { ...base, key: "future", dot: "wait", label: "—", tone: "idle" };
    if (!isWorkday(date)) return { ...base, key: "off", dot: "off", label: "Dam olish kuni", tone: "idle" };
    if (date === today && nowMin() <= ws + g) return { ...base, key: "wait", dot: "wait", label: "Hali kelmagan", tone: "idle" };
    return { ...base, key: "absent", dot: "absent", label: "Kelmadi", tone: "crit" };
  }
  const late = i - ws > g ? i - ws : 0;
  if (o == null) {
    if (date === today) {
      const w = Math.max(0, nowMin() - i);
      return late ? { ...base, late, worked: w, live: true, key: "late-in", dot: "late", label: `Ishda, ${late} daq kechikib keldi`, tone: "warn" }
                  : { ...base, worked: w, live: true, key: "in", dot: "in", label: "Ishda", tone: "ok" };
    }
    return { ...base, late, key: "noout", dot: "noout", label: "Ketish vaqti belgilanmagan", tone: "warn" };
  }
  const early = we - o > g ? we - o : 0;
  const res = { ...base, late, early, worked: Math.max(0, o - i), dot: "out" };
  if (late && early) return { ...res, key: "late-early", label: `${late} daq kechikdi, ${early} daq erta ketdi`, tone: "warn" };
  if (late) return { ...res, key: "late", label: `${late} daq kechikib keldi`, tone: "warn" };
  if (early) return { ...res, key: "early", label: `${early} daq erta ketdi`, tone: "warn" };
  return { ...res, key: "ok", label: "O'z vaqtida", tone: "ok" };
}
function deptDay(d, date) {
  const ppl = staffOf(d.id); let came = 0, late = 0, inNow = 0, first = null, last = null;
  for (const p of ppl) {
    const a = attInfo(p, date); const i = toMin(a.in), o = toMin(a.out);
    if (i != null) { came++; if (first == null || i < first) first = i; if (a.late) late++; if (o == null) inNow++; }
    if (o != null && (last == null || o > last)) last = o;
  }
  return { total: ppl.length, came, late, inNow, first: fromMin(first), last: fromMin(last) };
}

/* ================= database ================= */
const queues = {};
function enqueue(path, fn) { const p = (queues[path] || Promise.resolve()).catch(() => {}).then(fn); queues[path] = p; return p; }
function stripNulls(o) { if (Array.isArray(o)) return o; if (!o || typeof o !== "object") return o; const out = {}; for (const [k, v] of Object.entries(o)) { if (v === null) continue; out[k] = (v && typeof v === "object") ? stripNulls(v) : v; } return out; }
function merge(a, b) { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b || {})) { o[k] = (v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) ? merge(o[k], v) : v; } return o; }
function noDb() { toast("Baza ulanmagan, o'zgarish saqlanmadi", "crit"); return Promise.resolve(false); }
function writeFailed(e, path) {
  const code = e && e.code;
  if (code === "invalid_argument" || code === "not_granted" || code === "revoked") {
    if (path.startsWith("org/")) S.canAdmin = false; else { S.canWrite = false; S.canAdmin = false; }
    toast("Saqlab bo'lmadi: bu amal uchun sizda ruxsat yo'q", "crit");
  } else if (code === "quota_exceeded") toast("Saqlab bo'lmadi: ma'lumotlar bazasi to'lgan. Eski tasklarni o'chiring.", "crit");
  else if (code === "resource_exhausted") toast("Juda ko'p so'rov. Biroz kutib, qayta urinib ko'ring.", "crit");
  else toast("Saqlab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", "crit");
  schedule();
  return false;
}
async function withRetry(fn) { try { return await fn(); } catch (e) { if (e && e.code === "unavailable") { await sleep(400 + Math.random() * 700); return await fn(); } throw e; } }
function dbUpdate(path, patch, base) {
  if (!S.db) return noDb();
  return enqueue(path, async () => {
    const ref = S.db.doc(path);
    try { await withRetry(() => ref.update(patch)); }
    catch (e) {
      if (e && e.code === "invalid_argument" && base) {
        const snap = await ref.get().catch(() => null);
        if (snap && !snap.exists) { await withRetry(() => ref.set(stripNulls(merge(base(), patch)))); return true; }
      }
      throw e;
    }
    return true;
  }).catch(e => writeFailed(e, path));
}
function dbSet(path, data) { if (!S.db) return noDb(); return enqueue(path, () => withRetry(() => S.db.doc(path).set(data)).then(() => true)).catch(e => writeFailed(e, path)); }
function dbDelete(path) { if (!S.db) return noDb(); return enqueue(path, () => withRetry(() => S.db.doc(path).delete()).then(() => true)).catch(e => writeFailed(e, path)); }
const orgBase = () => ({ branches: {}, departments: {}, staff: {}, settings: {} });
const orgUpdate = patch => dbUpdate(ORG_PATH, patch, orgBase);
function setAtt(pid, date, field, value) { const m = monthOf(date); return dbUpdate(`attendance/${m}`, { days: { [date]: { [pid]: { [field]: value } } } }, () => ({ month: m, days: {} })); }

async function waitForClaude(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (window.claude && typeof window.claude.use === "function") return window.claude; await sleep(100); } return null; }
let slowTimer = null;
function allLoaded() { return S.loaded.org && S.loaded.tasks && S.loaded["att:" + monthOf(todayStr())]; }
function checkLoaded() { if (allLoaded()) { S.slow = false; clearTimeout(slowTimer); } }
let subs = [];
function attach(db) {
  subs.forEach(u => { try { u(); } catch (e) {} }); subs = [];
  for (const un of Object.values(S.monthSubs)) { try { un(); } catch (e) {} }
  S.monthSubs = {}; S.att = {}; S.loaded = {}; S.errors = {};
  const g = S.gen = (S.gen || 0) + 1;
  S.db = db;
  clearTimeout(slowTimer); S.slow = false;
  slowTimer = setTimeout(() => { if (g === S.gen && !allLoaded()) { S.slow = true; schedule(); } }, 10000);
  subs.push(db.doc(ORG_PATH).onSnapshot(snap => {
    if (g !== S.gen) return;
    S.org = normOrg(snap.exists ? snap.data() : null); S.loaded.org = true; delete S.errors.org; checkLoaded(); schedule();
  }, err => { if (g !== S.gen) return; S.errors.org = err; S.loaded.org = true; checkLoaded(); schedule(); }));
  subs.push(db.collection("tasks").onSnapshot(qs => {
    if (g !== S.gen) return;
    const next = {}; qs.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); });
    S.tasks = next; S.loaded.tasks = true; delete S.errors.tasks; checkLoaded(); schedule();
  }, err => { if (g !== S.gen) return; S.errors.tasks = err; S.loaded.tasks = true; checkLoaded(); schedule(); }));
  ensureMonths();
}
async function connect() {
  S.conn = "connecting"; render();
  const c = await waitForClaude(3000);
  let db = null;
  if (c) { try { db = await c.use("db"); } catch (e) { db = null; } }
  if (!db) { S.conn = "live"; startSandbox(false, true); return; }
  S.realDb = db; S.conn = "live";
  attach(db);
  c.use("user").then(async u => {
    if (!u) return;
    const perm = { canWrite: true, canAdmin: true };
    try { const w = await Promise.resolve(u.can("data.write")); if (w === false) { perm.canWrite = false; perm.canAdmin = false; } } catch (e) {}
    try { const a = await Promise.resolve(u.canEdit()); if (a === false) perm.canAdmin = false; } catch (e) {}
    S.perm = perm;
    if (!S.sandbox) { S.canWrite = perm.canWrite; S.canAdmin = perm.canAdmin; }
    schedule();
  }).catch(() => {});
}

/* ----- sinab ko'rish rejimi: shu oynaning xotirasidagi baza ----- */
const clone = o => JSON.parse(JSON.stringify(o));
function localDb(seed) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, clone(v)]));
  const listeners = new Set();
  const meta = { fromCache: false, hasPendingWrites: false };
  const snapDoc = path => { const d = store.get(path); const data = d ? clone(d) : undefined; return { id: path.split("/").pop(), exists: !!d, data: () => data, metadata: meta }; };
  const qsnap = path => { const n = path.split("/").length + 1; const docs = [...store.keys()].filter(k => k.startsWith(path + "/") && k.split("/").length === n).sort().map(snapDoc); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta }; };
  const notify = () => setTimeout(() => [...listeners].forEach(l => l()), 0);
  const fail = msg => Object.assign(new Error(msg), { code: "invalid_argument" });
  const doc = path => ({
    id: path.split("/").pop(), path,
    get: async () => snapDoc(path),
    set: async data => { store.set(path, clone(data)); notify(); },
    update: async data => { if (!store.has(path)) throw fail("missing"); store.set(path, merge(store.get(path), clone(data))); notify(); },
    delete: async () => { store.delete(path); notify(); },
    onSnapshot(next) { const l = () => next(snapDoc(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    collection: p => col(path + "/" + p)
  });
  const col = path => { const q = {
    path, doc: id => doc(path + "/" + (id || uid("x"))),
    add: async data => { const r = doc(path + "/" + uid("x")); await r.set(data); return r; },
    get: async () => qsnap(path),
    onSnapshot(next) { const l = () => next(qsnap(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    where() { return q; }, orderBy() { return q; }, limit() { return q; }
  }; return q; };
  return { doc, collection: col };
}
function demoSeed() {
  const off = Math.floor(diffDays(DEMO_BASE, todayStr()) / 7) * 7;
  const sh = d => (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) ? addDays(d, off) : d;
  const out = {}; const days = {};
  for (const [k, v] of Object.entries(clone(DEMO))) {
    if (k.startsWith("tasks/")) { v.start = sh(v.start); v.due = sh(v.due); v.doneAt = sh(v.doneAt); out[k] = v; }
    else if (k.startsWith("attendance/")) { for (const [d, map] of Object.entries(v.days || {})) days[sh(d)] = map; }
    else out[k] = v;
  }
  for (const [d, map] of Object.entries(days)) { const m = monthOf(d); (out["attendance/" + m] = out["attendance/" + m] || { month: m, days: {}, demo: true }).days[d] = map; }
  return out;
}
function startSandbox(fromCurrent, auto) {
  let seed;
  if (fromCurrent && Object.keys(S.org.branches).length) {
    seed = { [ORG_PATH]: clone(S.org) };
    for (const [id, t] of Object.entries(S.tasks)) seed["tasks/" + id] = clone(t);
    for (const [m, a] of Object.entries(S.att)) seed["attendance/" + m] = clone(a);
  } else seed = demoSeed();
  S.sandbox = true; S.sandboxAuto = !!auto; S.canWrite = true; S.canAdmin = true;
  attach(localDb(seed));
  if (!auto) toast("Sinab ko'rish rejimi yoqildi");
  schedule();
}
function exitSandbox() {
  if (!S.realDb) return;
  S.sandbox = false; S.canWrite = S.perm ? S.perm.canWrite : true; S.canAdmin = S.perm ? S.perm.canAdmin : true;
  attach(S.realDb); toast("Asl ma'lumotlarga qaytildi"); schedule();
}
function ensureMonths() {
  if (!S.db) return;
  const keep = new Set([monthOf(todayStr()), monthOf(S.attDate || todayStr()), S.dash.month || monthOf(todayStr())]);
  for (const m of keep) {
    if (S.monthSubs[m]) continue;
    const g = S.gen;
    S.monthSubs[m] = S.db.doc(`attendance/${m}`).onSnapshot(snap => {
      if (g !== S.gen) return;
      S.att[m] = snap.exists ? snap.data() : { month: m, days: {} }; S.loaded["att:" + m] = true; delete S.errors["att:" + m]; checkLoaded(); schedule();
    }, err => { S.errors["att:" + m] = err; S.loaded["att:" + m] = true; checkLoaded(); schedule(); });
  }
  for (const [m, un] of Object.entries(S.monthSubs)) {
    if (!keep.has(m)) { try { un(); } catch (e) {} delete S.monthSubs[m]; delete S.att[m]; delete S.loaded["att:" + m]; }
  }
}

/* ================= rendering ================= */
let rafId = 0;
function schedule() { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; render(); }); }
const main = () => document.getElementById("view");
function render() {
  const view = main();
  const ae = document.activeElement;
  const keep = ae && ae.id && view.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const scrolls = $$("[data-keep-scroll]", view).map(el => [el.id, el.scrollLeft, el.scrollTop]);
  S.lastMinute = nowHM();
  renderChrome();
  let html = "";
  if (S.view === "bolim") html = viewDept();
  else if (S.view === "tasklar") html = viewTasks();
  else if (S.view === "davomat") html = viewAtt();
  else if (S.view === "sozlamalar") html = viewSettings();
  else if (S.view === "qollanma") html = viewHelp();
  else if (S.view === "dashboard") html = viewDash();
  else html = viewOrg();
  view.innerHTML = html;
  scrolls.forEach(([id, l, t]) => { const el = document.getElementById(id); if (el) { el.scrollLeft = l; el.scrollTop = t; } });
  postRender();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
}
function renderChrome() {
  $$("[data-nav]").forEach(a => { const on = a.dataset.nav === S.view || (S.view === "bolim" && a.dataset.nav === "tuzilma"); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  const sync = $("#sync");
  sync.className = "sync " + (S.sandbox ? "demo" : S.conn === "live" ? "live" : "");
  sync.textContent = S.sandbox ? "Sinab ko'rish rejimi" : S.conn === "live" ? (S.canWrite ? "Jonli, saqlanadi" : "Faqat ko'rish") : "Ulanmoqda";
  const nb = $("#top-new"); nb.hidden = !(S.canWrite && S.conn === "live" && Object.keys(S.org.departments).length);
  const msgs = [];
  if (S.sandbox) msgs.push(["warn", S.sandboxAuto
    ? "Siz namuna ma'lumotlar bilan sinab ko'rish rejimidasiz. Hamma tugmalar ishlaydi, lekin o'zgarishlar faqat shu oynada qoladi va sahifa yangilansa tozalanadi."
    : "Sinab ko'rish rejimi: bemalol bosib ko'ring, o'zgarishlar faqat shu oynada qoladi va hech kimga ta'sir qilmaydi.",
    S.sandboxAuto ? "" : `<button type="button" class="btn tiny" data-action="exit-sandbox">Asl ma'lumotlarga qaytish</button>`]);
  else if (S.slow && !allLoaded()) msgs.push(["warn", "Ma'lumotlar hali yuklanmadi. Internet aloqasini tekshiring, sahifa o'zi qayta urinadi."]);
  if (!S.sandbox && Object.keys(S.errors).length) msgs.push(["crit", "Ma'lumotlarning bir qismini o'qib bo'lmadi. Sahifani keyinroq qayta oching."]);
  if (!S.sandbox && S.conn === "live" && !S.canWrite) msgs.push(["info", "Sizda faqat ko'rish huquqi bor. Dasturni o'zingiz bosib sinab ko'rmoqchi bo'lsangiz, sinab ko'rish rejimini yoqing: o'zgarishlar faqat sizning oynangizda qoladi.", `<button type="button" class="btn primary tiny" data-action="start-sandbox">Sinab ko'rish rejimi</button>`]);
  $("#banner").innerHTML = msgs.map(([t, m, extra]) => `<div class="banner ${t}"><span>${esc(m)}</span>${extra || ""}</div>`).join("");
}
const loadingBlock = () => `<p class="loading">Ma'lumotlar yuklanmoqda…</p>`;
const stat = (v, label, cls = "") => `<span class="stat ${cls}"><b>${esc(v)}</b><span>${esc(label)}</span></span>`;

/* ----- Tuzilma (sketch 1) ----- */
function viewOrg() {
  if (!S.loaded.org) return loadingBlock();
  const bl = branches();
  if (!bl.length) return emptyOrg();
  const all = tasks();
  const active = all.filter(t => t.status !== "done");
  const focus = S.focusTask && S.tasks[S.focusTask] ? { ...S.tasks[S.focusTask], id: S.focusTask } : null;
  if (S.focusTask && !focus) S.focusTask = null;
  const today = todayStr();
  const people = allStaff();
  const came = people.filter(p => rec(today, p.id)?.in).length;
  const overdue = active.filter(t => stateOf(t) === "overdue").length;
  const week = active.filter(t => t.due && t.due >= today && t.due <= addDays(today, 7)).length;
  let welcomeSeen = S.welcomeHidden; try { welcomeSeen = welcomeSeen || localStorage.getItem("jb-welcome") === "1"; } catch (e) {}
  return `
  ${welcomeSeen ? "" : `<section class="welcome" aria-label="Xush kelibsiz">
    <div><h2>Xush kelibsiz</h2><p>Bu sahifada kompaniyaning B2B va B2C bo'limlari, xodimlari, tasklari va davomati bir joyda. Bo'lim nomi ustiga kursorni olib borsangiz, xodimlar ro'yxati ochiladi. Umumiy ko'rsatkichlar Dashboard varag'ida.</p></div>
    <div class="actions"><a class="btn primary" href="#qollanma">Qo'llanmani ochish</a><button type="button" class="btn" data-action="dismiss-welcome">Tushunarli</button></div>
  </section>`}
  <section class="summary" aria-label="Bugungi holat">
    ${stat(people.length, "xodim")}
    ${stat(`${came}/${people.length}`, "bugun keldi")}
    ${stat(active.length, "faol task")}
    ${stat(overdue, "muddati o'tgan", overdue ? "crit" : "")}
    ${stat(week, "7 kun ichida tugaydi")}
    <span class="summary-date">${esc(WD_LONG[parseYmd(today).getDay()])}, ${esc(fmtDate(today))}</span>
  </section>
  <div class="org-layout">
    <section class="org-board" aria-label="Kompaniya tuzilmasi">
      ${focus ? focusBar(focus) : `<p class="board-hint">Bo'lim nomi ustiga kursorni olib borsangiz, xodimlar ro'yxati ochiladi. Nomini bossangiz, bo'lim ichiga kirasiz. O'ngdagi ro'yxatdan taskni tanlasangiz, uni bajarayotgan bo'limlar sxemada ajralib turadi.</p>`}
      <div class="board-scroll" id="board-scroll" data-keep-scroll>
        <div class="branches${focus ? " is-focus" : ""}">
          ${bl.map((b, i) => branchHTML(b, i % 2 === 1, focus)).join("")}
        </div>
      </div>
      <div class="legend" aria-label="Belgilar"><span><i class="dot dot-in"></i>Ishda</span><span><i class="dot dot-late"></i>Kechikib keldi</span><span><i class="dot dot-out"></i>Ketdi</span><span><i class="dot dot-wait"></i>Hali kelmagan</span><span><i class="dot dot-absent"></i>Kelmadi</span><span>Ism yonidagi vaqt: bugun kelgan vaqti</span></div>
    </section>
    ${railHTML(active, all.length - active.length, focus)}
  </div>`;
}
function emptyOrg() {
  return `<div class="empty-state"><h2>Tuzilma hali kiritilmagan</h2>
    <p>Sxemangizdagi B2B va B2C tarmoqlarini 9 ta bo'lim bilan bir bosishda yaratish mumkin. Keyin xodimlarni qo'shasiz.</p>
    ${S.canAdmin && S.conn === "live" ? `<div class="actions"><button type="button" class="btn primary" data-action="make-template">B2B va B2C tuzilmasini yaratish</button><a class="btn" href="#sozlamalar">Qo'lda sozlash</a></div>` : `<p>Tuzilmani sahifa egasi kiritadi.</p>`}
  </div>`;
}
function branchHTML(b, mirror, focus) {
  const ds = depts(b.id);
  const n = ds.reduce((s, d) => s + staffOf(d.id).length, 0);
  return `<section class="branch${mirror ? " mirror" : ""}" aria-label="${esc(b.name)}">
    <div class="branch-top"><span class="elbow" aria-hidden="true"></span><h2 class="branch-head">${esc(b.name)}</h2><span class="branch-meta">${ds.length} bo'lim · ${n} xodim</span></div>
    <ul class="spine">
      ${ds.map(d => deptNode(d, focus)).join("")}
      ${S.canAdmin && S.conn === "live" ? `<li class="dept-node"><div class="node-body"><button type="button" class="dept-tab add" data-action="new-dept" data-branch="${esc(b.id)}">+ Bo'lim qo'shish</button></div></li>` : ""}
    </ul>
  </section>`;
}
function deptNode(d, focus) {
  const ppl = staffOf(d.id); const today = todayStr();
  const dt = tasks().filter(t => t.status !== "done" && hasDept(t, d.id));
  const over = dt.filter(t => stateOf(t) === "overdue").length;
  const on = !!focus && hasDept(focus, d.id);
  const hitSet = new Set(on && Array.isArray(focus.staffIds) ? focus.staffIds : []);
  const hits = ppl.filter(p => hitSet.has(p.id)).length;
  const sum = deptDay(d, today);
  const open = S.openDept === d.id;
  const rows = ppl.map((p, i) => { const a = attInfo(p, today); return `<li class="${hitSet.has(p.id) ? "is-hit" : ""}"><span class="idx">${i + 1}.</span><span class="dot dot-${a.dot}" title="${esc(a.label)}"></span><span class="nm">${esc(p.name)}</span><span class="tm">${esc(a.in)}</span>${p.role ? `<span class="rl">${esc(p.role)}</span>` : ""}</li>`; }).join("");
  const meta = on
    ? `<span class="hit-badge">Shu taskda: ${hits ? hits + " xodim" : "butun bo'lim"}</span>`
    : `${sum.came}/${sum.total} keldi · ${dt.length} faol task${over ? ` · <span class="flag">${over} kechikkan</span>` : ""}`;
  return `<li class="dept-node${on ? " is-on" : ""}${open ? " open" : ""}" data-dept="${esc(d.id)}">
    <div class="node-body">
      <a class="dept-tab" href="#bolim-${esc(d.id)}">${esc(d.name)}<span class="cnt">${ppl.length}</span></a>
      <span class="node-meta">${meta}</span>
      <button type="button" class="node-toggle" data-action="toggle-dept" data-id="${esc(d.id)}" aria-expanded="${open}" aria-controls="pop-${esc(d.id)}" aria-label="${esc(d.name)}: xodimlar ro'yxati">▾</button>
      <div class="staff-card" id="pop-${esc(d.id)}" data-action="go" data-href="#bolim-${esc(d.id)}">
        <div class="pop-head"><strong>${esc(d.name)} xodimlari</strong><span>${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span></div>
        ${ppl.length ? `<ol class="staff-list">${rows}</ol>` : `<p class="card-empty">Xodim qo'shilmagan</p>`}
        <div class="card-foot"><span>${dt.length} faol task</span>${over ? `<span class="flag">${over} kechikkan</span>` : ""}<span class="foot-att">${sum.came}/${sum.total} keldi</span></div>
        <span class="pop-cta">Bo'limni ochish →</span>
      </div>
    </div>
  </li>`;
}
function focusBar(t) {
  const st = stateOf(t); const info = dueInfo(t);
  return `<div class="focus-bar">
    <span class="pill s-${st}">${STATE_LABEL[st]}</span>
    <strong class="fb-title">${esc(t.title)}</strong>
    <span class="fb-meta">${tDepts(t).length} ta bo'lim · ${tStaff(t).length} xodim · muddat ${esc(fmtDate(t.due))} (${esc(info.text)})</span>
    <span class="fb-actions"><button type="button" class="btn tiny" data-action="open-task" data-id="${esc(t.id)}">Batafsil</button><button type="button" class="icon-btn" data-action="clear-focus" aria-label="Tanlovni bekor qilish">×</button></span>
  </div>`;
}
function railHTML(active, doneCount, focus) {
  const list = active.slice().sort(byDue);
  return `<aside class="task-rail" aria-label="Faol tasklar">
    <div class="rail-head"><h2>Faol tasklar</h2><p>Taskni bossangiz, uni bajarayotgan bo'limlar sxemada belgilanadi.</p></div>
    <div class="rail-wrap at-start" id="rail-wrap">
    <button type="button" class="rail-nav prev" data-action="rail-scroll" data-dir="-1" aria-label="Oldingi tasklar">‹</button>
    <div class="rail-list" id="rail-list">${list.length ? list.map(t => {
      const st = stateOf(t), info = dueInfo(t), on = !!focus && focus.id === t.id;
      return `<button type="button" class="rail-task s-${st}${on ? " is-active" : ""}" data-action="focus-task" data-id="${esc(t.id)}" aria-pressed="${on}">
        <span class="rt-title">${esc(t.title)}</span>
        <span class="rt-meta"><span class="rt-depts">${tDepts(t).length} bo'lim</span><span class="due ${info.cls}">${esc(info.text)}</span></span>
        <span class="bar"><i style="width:${pct(t)}%"></i></span>
      </button>`; }).join("") : `<p class="muted">Faol task yo'q.</p>`}</div>
    <button type="button" class="rail-nav next" data-action="rail-scroll" data-dir="1" aria-label="Keyingi tasklar">›</button>
    </div>
    <div class="rail-dots" id="rail-dots" aria-hidden="true"></div>
    <div class="rail-foot">${S.canWrite && S.conn === "live" ? `<button type="button" class="btn tiny" data-action="new-task">+ Yangi task</button>` : ""}<a href="#tasklar">Barcha tasklar${doneCount ? ` (${doneCount} bajarilgan)` : ""}</a></div>
  </aside>`;
}

/* ----- Bo'lim ichki ko'rinishi (sketch 2) ----- */
function runs(arr) { const out = []; let s = arr[0], p = arr[0]; for (let i = 1; i < arr.length; i++) { if (arr[i] === p + 1) { p = arr[i]; continue; } out.push([s, p]); s = p = arr[i]; } out.push([s, p]); return out; }
function viewDept() {
  if (!S.loaded.org) return loadingBlock();
  const d = getDept(S.deptId);
  if (!d) return `<div class="empty-state"><h2>Bo'lim topilmadi</h2><p>U o'chirilgan yoki nomi o'zgargan bo'lishi mumkin.</p><div class="actions"><a class="btn" href="#tuzilma">Tuzilmaga qaytish</a></div></div>`;
  const ppl = staffOf(d.id); const N = Math.max(ppl.length, 1);
  const today = todayStr();
  const mine = tasks().filter(t => hasDept(t, d.id));
  const active = mine.filter(t => t.status !== "done").sort(byDue);
  const done = mine.filter(t => t.status === "done").sort((a, b) => String(b.doneAt || b.due || "").localeCompare(String(a.doneAt || a.due || "")));
  const col = new Map(ppl.map((p, i) => [p.id, i]));
  const rows = [], blocks = [];
  for (const t of active) {
    const cs = [...new Set((t.staffIds || []).map(id => col.get(id)).filter(i => i !== undefined))].sort((a, b) => a - b);
    const segs = cs.length ? runs(cs) : [[0, N - 1]];
    const busy = r => rows[r] && segs.some(([a, b]) => { for (let c = a; c <= b; c++) if (rows[r].has(c)) return true; return false; });
    let r = 0; while (busy(r)) r++;
    if (!rows[r]) rows[r] = new Set();
    segs.forEach(([a, b]) => { for (let c = a; c <= b; c++) rows[r].add(c); });
    segs.forEach(([a, b], k) => blocks.push({ t, a, b, r, cont: k > 0, whole: !cs.length }));
  }
  const R = Math.max(rows.length, 1);
  const sum = deptDay(d, today);
  const partners = new Map();
  active.forEach(t => (t.deptIds || []).forEach(id => { if (id !== d.id && getDept(id)) partners.set(id, (partners.get(id) || 0) + 1); }));
  const bn = branchName(d.branch);
  return `
  <nav class="crumbs" aria-label="Joylashuv"><a href="#tuzilma">Tuzilma</a><span aria-hidden="true">/</span><span>${esc(bn || "—")}</span><span aria-hidden="true">/</span><strong>${esc(d.name)}</strong></nav>
  <div class="dept-scroll" id="dept-scroll" data-keep-scroll>
    <div class="dept-board" style="--cols:${N};--rows:${R}">
      <div class="dept-side" style="grid-column:1;grid-row:1 / -1">
      <div class="dept-hero">
        ${bn ? `<span class="branch-tag">${esc(bn)}</span>` : ""}
        <h2>${esc(d.name)}</h2>
        <dl class="hero-facts">
          <div><dt>Ish vaqti</dt><dd class="mono">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</dd></div>
          <div><dt>Bugun keldi</dt><dd class="mono">${sum.came}/${sum.total}</dd></div>
          <div><dt>Birinchi kelgan</dt><dd class="mono">${sum.first || "—"}</dd></div>
          <div><dt>Faol task</dt><dd class="mono">${active.length}</dd></div>
        </dl>
        <div class="hero-actions">
          ${S.canWrite && S.conn === "live" ? `<button type="button" class="btn primary tiny" data-action="new-task" data-dept="${esc(d.id)}">+ Task</button>` : ""}
          ${S.canAdmin && S.conn === "live" ? `<button type="button" class="btn tiny" data-action="new-staff" data-dept="${esc(d.id)}">+ Xodim</button><button type="button" class="btn tiny ghost" data-action="edit-dept" data-id="${esc(d.id)}">Tahrirlash</button>` : ""}
        </div>
      </div>
      <aside class="partners">
        <h3>Birga ishlayotgan bo'limlar</h3>
        ${partners.size ? `<ul>${[...partners].sort((a, b) => b[1] - a[1]).map(([id, n]) => { const pd = getDept(id); return `<li><a class="chip" href="#bolim-${esc(id)}">${esc(pd.name)}<small>${esc(branchName(pd.branch))}</small></a><span class="muted">${n} ta umumiy task</span></li>`; }).join("")}</ul>` : `<p class="muted">Faol tasklar boshqa bo'limlar bilan bo'lishilmagan.</p>`}
      </aside>
      </div>
      ${ppl.length ? ppl.map((p, i) => staffTile(p, i, today, active)).join("") : `<div class="staff-tile empty" style="grid-column:2;grid-row:1">Bu bo'limda hali xodim yo'q.</div>`}
      ${blocks.map(x => blockHTML(x, d)).join("")}
      ${active.length ? "" : `<div class="no-tasks" style="grid-column:2 / -1;grid-row:2"><p>Bu bo'limda faol task yo'q.</p>${S.canWrite && S.conn === "live" ? `<button type="button" class="btn" data-action="new-task" data-dept="${esc(d.id)}">+ Yangi task</button>` : ""}</div>`}
    </div>
  </div>
  ${done.length ? `<details class="done-list" id="done-list"${S.doneOpen ? " open" : ""}><summary>Bajarilgan tasklar (${done.length})</summary><ul>${done.map(t => `<li><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="muted mono">${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span><span class="muted">${tDepts(t).length} bo'lim</span></li>`).join("")}</ul></details>` : `<div style="height:40px"></div>`}`;
}
function staffTile(p, i, today, active) {
  const a = attInfo(p, today);
  const load = active.filter(t => (t.staffIds || []).includes(p.id)).length;
  let btn = "";
  if (S.canWrite && S.conn === "live") {
    if (!a.in) btn = `<button type="button" class="btn tiny" data-action="check-in" data-id="${esc(p.id)}">Keldi</button>`;
    else if (!a.out) btn = `<button type="button" class="btn tiny" data-action="check-out" data-id="${esc(p.id)}">Ketdi</button>`;
  }
  return `<div class="staff-tile" style="grid-column:${i + 2};grid-row:1">
    <div class="st-head"><span class="idx">${i + 1}.</span><span class="nm">${esc(p.name)}</span>${S.canAdmin && S.conn === "live" ? `<button type="button" class="icon-btn sm" data-action="edit-staff" data-id="${esc(p.id)}" aria-label="${esc(p.name)}: tahrirlash">✎</button>` : ""}</div>
    ${p.role ? `<div class="st-role">${esc(p.role)}</div>` : ""}
    <div class="st-att"><span class="dot dot-${a.dot}"></span><span>${esc(a.label)}</span></div>
    <div class="st-times"><span>Keldi <b class="mono">${esc(a.in || "—")}</b></span><span>Ketdi <b class="mono">${esc(a.out || "—")}</b></span></div>
    <div class="st-foot"><span>${load} faol task</span>${btn}</div>
  </div>`;
}
function blockHTML(x, d) {
  const t = x.t, st = stateOf(t), info = dueInfo(t);
  const others = tDepts(t).filter(o => o.id !== d.id);
  const mine = tStaff(t).filter(p => p.deptId === d.id);
  return `<button type="button" class="task-block s-${st}" style="grid-column:${x.a + 2} / ${x.b + 3};grid-row:${x.r + 2}" data-action="open-task" data-id="${esc(t.id)}">
    <span class="tb-top"><span class="pill s-${st}">${STATE_LABEL[st]}</span>${x.cont ? `<span class="tb-cont">davomi</span>` : ""}</span>
    <span class="tb-title">${esc(t.title)}</span>
    <span class="tb-due"><span class="mono">${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span><span class="due ${info.cls}">${esc(info.text)}</span></span>
    <span class="tb-prog"><span class="bar"><i style="width:${pct(t)}%"></i></span><span class="mono">${pct(t)}%</span></span>
    <span class="tb-who">${x.whole ? "Butun bo'lim" : mine.map(p => esc(shortName(p.name))).join(", ")}</span>
    <span class="tb-others">${others.length ? `Yana ${others.length} bo'lim: ${others.map(o => `<span class="chip">${esc(o.name)}<small>${esc(branchName(o.branch))}</small></span>`).join(" ")}` : "Faqat shu bo'lim"}</span>
  </button>`;
}

/* ----- Tasklar ----- */
function filteredTasks() {
  const f = S.tf, q = normQ(f.q).trim();
  return tasks().filter(t => {
    if (f.status !== "all" && stateOf(t) !== f.status) return false;
    if (f.dept !== "all") {
      if (f.dept.startsWith("b:")) { const b = f.dept.slice(2); if (!tDepts(t).some(d => d.branch === b)) return false; }
      else if (!hasDept(t, f.dept.slice(2))) return false;
    }
    if (q) {
      const hay = normQ([t.title, t.desc, ...tStaff(t).map(p => p.name), ...tDepts(t).map(d => d.name)].join(" "));
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort(byDue);
}
function viewTasks() {
  if (!S.loaded.org || !S.loaded.tasks) return loadingBlock();
  const f = S.tf, all = tasks();
  const counts = { all: all.length, new: 0, progress: 0, review: 0, overdue: 0, done: 0 };
  all.forEach(t => counts[stateOf(t)]++);
  const opts = [`<option value="all">Barcha bo'limlar</option>`].concat(branches().map(b => `<optgroup label="${esc(b.name)}"><option value="b:${esc(b.id)}"${f.dept === "b:" + b.id ? " selected" : ""}>${esc(b.name)}: barchasi</option>${depts(b.id).map(d => `<option value="d:${esc(d.id)}"${f.dept === "d:" + d.id ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</optgroup>`)).join("");
  return `
  <div class="view-head"><h2>Tasklar</h2><p>Har bir task qaysi bo'limlar va xodimlar zimmasida ekani, qachon yakunlanishi va hozirgi holati.</p></div>
  <div class="toolbar">
    <label class="sr" for="tq">Qidirish</label><input type="search" id="tq" value="${esc(f.q)}" placeholder="Task, xodim yoki bo'lim">
    <div class="seg" role="group" aria-label="Holat bo'yicha">${["all","new","progress","review","overdue","done"].map(k => `<button type="button" data-action="tf-status" data-v="${k}" aria-pressed="${f.status === k}">${k === "all" ? "Hammasi" : STATE_LABEL[k]}<span class="n">${counts[k]}</span></button>`).join("")}</div>
    <label class="sr" for="tdept">Bo'lim</label><select id="tdept" data-change="tf-dept">${opts}</select>
    <div class="seg" role="group" aria-label="Ko'rinish"><button type="button" data-action="tf-mode" data-v="table" aria-pressed="${f.mode === "table"}">Jadval</button><button type="button" data-action="tf-mode" data-v="gantt" aria-pressed="${f.mode === "gantt"}">Muddatlar grafigi</button></div>
  </div>
  <div id="task-results">${taskResults()}</div>`;
}
function taskResults() {
  const list = filteredTasks();
  if (!list.length) return `<p class="note">${tasks().length ? "Tanlangan shartlarga mos task topilmadi." : "Hali task yo'q. «Yangi task» tugmasi bilan birinchisini qo'shing."}</p>`;
  return S.tf.mode === "gantt" ? ganttHTML(list) : tableHTML(list);
}
function tableHTML(list) {
  const canEdit = S.canWrite && S.conn === "live";
  return `<div class="table-wrap"><table class="tasks">
    <thead><tr><th scope="col">Task</th><th scope="col">Qaysi bo'limlar</th><th scope="col">Mas'ul xodimlar</th><th scope="col">Muddat</th><th scope="col">Holat</th><th scope="col">Bajarilish</th></tr></thead>
    <tbody>${list.map(t => {
      const st = stateOf(t), info = dueInfo(t), ds = tDepts(t), ps = tStaff(t);
      return `<tr class="s-${st}">
        <td><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button>${t.desc ? `<div class="sub">${esc(String(t.desc).slice(0, 110))}${String(t.desc).length > 110 ? "…" : ""}</div>` : ""}</td>
        <td><div class="dept-count"><strong>${ds.length}</strong> bo'lim</div><div class="chips">${ds.map(d => `<a class="chip" href="#bolim-${esc(d.id)}">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></a>`).join("")}</div></td>
        <td>${ps.length ? `<div class="avatars">${ps.slice(0, 6).map(p => `<span class="av" title="${esc(p.name)}">${esc(initials(p.name))}</span>`).join("")}${ps.length > 6 ? `<span class="av">+${ps.length - 6}</span>` : ""}</div><div class="sub">${ps.slice(0, 3).map(p => esc(shortName(p.name))).join(", ")}${ps.length > 3 ? ` va yana ${ps.length - 3}` : ""}</div>` : `<span class="muted">Butun bo'lim</span>`}</td>
        <td><span class="mono">${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span><div class="due ${info.cls}">${esc(info.text)}</div></td>
        <td>${canEdit ? `<label class="sr" for="st-${esc(t.id)}">Holat</label><select id="st-${esc(t.id)}" class="status-select s-${st}" data-change="task-status" data-id="${esc(t.id)}">${EDIT_STATUSES.map(s => `<option value="${s}"${t.status === s ? " selected" : ""}>${STATE_LABEL[s]}</option>`).join("")}</select>${st === "overdue" ? `<div class="due crit">Muddati o'tgan</div>` : ""}` : `<span class="pill s-${st}">${STATE_LABEL[st]}</span>`}</td>
        <td><div class="prog-cell"><span class="bar"><i style="width:${pct(t)}%"></i></span><span class="mono">${pct(t)}%</span></div></td>
      </tr>`; }).join("")}</tbody></table></div>`;
}
function ganttHTML(list) {
  const today = todayStr();
  const pts = list.flatMap(t => [t.start, t.due]).filter(Boolean).concat([addDays(today, -3), addDays(today, 7)]).sort();
  let s = addDays(pts[0], -1), e = addDays(pts[pts.length - 1], 1);
  let D = diffDays(s, e) + 1; if (D > 370) { e = addDays(s, 369); D = 370; }
  const frac = date => diffDays(s, date) / D;
  const dense = D <= 62;
  let months = "", days = "", grid = "";
  for (let i = 0; i < D; i++) {
    const ds = addDays(s, i), dt = parseYmd(ds), wd = dt.getDay();
    const cls = `${isWorkday(ds) ? "" : "wk"}${ds === today ? " today" : ""}`;
    days += `<span class="g-day ${cls}">${dense || wd === 1 ? `<b>${dt.getDate()}</b>${dense ? `<i>${WD[wd]}</i>` : ""}` : ""}</span>`;
    grid += `<span class="${cls}"></span>`;
    if (i === 0 || (dt.getDate() === 1 && D - i >= 4)) months += `<span class="g-month" style="left:${(i / D * 100).toFixed(3)}%">${esc(cap(MONTHS[dt.getMonth()]))} ${dt.getFullYear()}</span>`;
  }
  const rows = list.map(t => {
    const st = stateOf(t);
    let a = t.start || t.due, b = t.due || t.start; if (a > b) [a, b] = [b, a];
    const left = clamp(frac(a), 0, 1) * 100, width = Math.max(0.6, Math.min(100 - left, (diffDays(a, b) + 1) / D * 100));
    let late = "", end = left + width;
    if (st === "overdue") { const l = frac(addDays(b, 1)) * 100, w = diffDays(b, today) / D * 100; late = `<span class="g-late" style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%" title="${diffDays(b, today)} kun kechikish"></span>`; end = l + w; }
    const info = dueInfo(t);
    const label = st === "done" ? esc(info.text) : `${esc(fmtDate(b))} · ${esc(info.text)}`;
    let pos, inside = "";
    if (end < 74) pos = `left:calc(${end.toFixed(3)}% + 8px)`;
    else if (left > 26) pos = `right:calc(${(100 - left).toFixed(3)}% + 8px)`;
    else { pos = `right:calc(${(100 - Math.min(end, 100)).toFixed(3)}% + 6px)`; inside = " inside"; }
    return `<div class="g-row s-${st}">
      <button type="button" class="g-label" data-action="open-task" data-id="${esc(t.id)}"><span class="g-title">${esc(t.title)}</span><span class="g-meta">${tDepts(t).length} bo'lim · ${STATE_LABEL[st]} · ${pct(t)}%</span></button>
      <div class="g-track"><span class="g-bar" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" title="${esc(fmtDate(a))} → ${esc(fmtDate(b))}"><i style="width:${pct(t)}%"></i></span>${late}<span class="g-due${info.cls === "crit" ? " crit" : ""}${inside}" style="${pos}">${label}</span></div>
    </div>`;
  }).join("");
  return `<div class="gantt-wrap" id="gantt-scroll" data-keep-scroll><div class="gantt" style="--days:${D};--day:${dense ? 26 : 12}px">
    <div class="g-head"><div class="g-corner">Task</div><div class="g-scale"><div class="g-months">${months}</div><div class="g-days">${days}</div></div></div>
    <div class="g-body"><div class="g-grid" aria-hidden="true">${grid}</div>${rows}</div>
  </div></div>`;
}

/* ----- Davomat ----- */
function viewAtt() {
  if (!S.loaded.org) return loadingBlock();
  const today = todayStr(), date = S.attDate || today, m = monthOf(date);
  const loaded = S.loaded["att:" + m] || S.conn === "none";
  const isMonth = S.attMode === "month";
  return `
  <div class="view-head"><h2>Davomat</h2><p>Har bir bo'lim va xodimning kelish-ketish vaqti. Ish vaqti bo'lim sozlamasidan olinadi, ${settings().grace} daqiqagacha kechikish hisobga olinmaydi.</p></div>
  <div class="toolbar">
    <div class="date-nav"><button type="button" class="btn tiny" data-action="att-shift" data-dir="-1" aria-label="${isMonth ? "Oldingi oy" : "Oldingi kun"}">‹</button><label class="sr" for="att-date">Sana</label><input type="date" id="att-date" value="${esc(date)}" data-change="att-date"><button type="button" class="btn tiny" data-action="att-shift" data-dir="1" aria-label="${isMonth ? "Keyingi oy" : "Keyingi kun"}">›</button>${date !== today ? `<button type="button" class="btn tiny ghost" data-action="att-today">Bugun</button>` : ""}</div>
    <span class="date-label">${isMonth ? esc(fmtMonth(m)) : `${esc(WD_LONG[parseYmd(date).getDay()])}, ${esc(fmtDate(date))} ${parseYmd(date).getFullYear()}`}</span>
    <div class="seg" role="group" aria-label="Ko'rinish"><button type="button" data-action="att-mode" data-v="day" aria-pressed="${!isMonth}">Kunlik</button><button type="button" data-action="att-mode" data-v="month" aria-pressed="${isMonth}">Oylik hisobot</button></div>
  </div>
  ${!loaded ? loadingBlock() : isMonth ? attMonthHTML(m) : attDayHTML(date)}`;
}
function attDayHTML(date) {
  const isToday = date === todayStr();
  const btnCol = S.canWrite && S.conn === "live" && isToday;
  const out = [];
  if (!isWorkday(date)) out.push(`<p class="note">Bu kun ish kuni sifatida belgilanmagan. Ish kunlarini Sozlamalarda o'zgartirish mumkin.</p>`);
  branches().forEach(b => depts(b.id).forEach(d => {
    const ppl = staffOf(d.id), s = deptDay(d, date);
    out.push(`<section class="att-dept">
      <header class="att-head">
        <a class="dept-tab sm" href="#bolim-${esc(d.id)}">${esc(d.name)}</a><span class="branch-tag">${esc(b.name)}</span>
        <span class="att-hours">Ish vaqti <b class="mono">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</b></span>
        <span class="att-sum"><span>Keldi <b>${s.came}/${s.total}</b></span><span>Birinchi kelgan <b>${s.first || "—"}</b></span><span>Oxirgi ketgan <b>${s.last || "—"}</b></span>${isToday ? `<span>Hozir ishda <b>${s.inNow}</b></span>` : ""}${s.late ? `<span class="warn-t">Kechikkan <b>${s.late}</b></span>` : ""}</span>
      </header>
      ${ppl.length ? `<div class="table-scroll"><table class="att"><thead><tr><th scope="col">#</th><th scope="col">Xodim</th><th scope="col">Kelish</th><th scope="col">Ketish</th><th scope="col">Ishlagan</th><th scope="col">Holat</th>${btnCol ? `<th scope="col"><span class="sr">Amal</span></th>` : ""}</tr></thead><tbody>${ppl.map((p, i) => attRow(p, i, date, btnCol)).join("")}</tbody></table></div>` : `<p class="muted" style="padding:12px 16px;margin:0">Bu bo'limda xodim yo'q.</p>`}
    </section>`);
  }));
  return out.join("") || `<p class="note">Bo'limlar hali qo'shilmagan.</p>`;
}
function attRow(p, i, date, btnCol) {
  const a = attInfo(p, date), dis = S.canWrite && S.conn === "live" ? "" : " disabled";
  return `<tr>
    <td class="mono muted">${i + 1}</td>
    <td><div class="nm">${esc(p.name)}</div>${p.role ? `<div class="sub">${esc(p.role)}</div>` : ""}</td>
    <td><input type="text" class="clock" inputmode="numeric" maxlength="5" placeholder="--:--" autocomplete="off" id="in-${esc(p.id)}" value="${esc(a.in)}" data-change="att-time" data-id="${esc(p.id)}" data-field="in" aria-label="${esc(p.name)}: kelish vaqti (SS:DD)"${dis}></td>
    <td><input type="text" class="clock" inputmode="numeric" maxlength="5" placeholder="--:--" autocomplete="off" id="out-${esc(p.id)}" value="${esc(a.out)}" data-change="att-time" data-id="${esc(p.id)}" data-field="out" aria-label="${esc(p.name)}: ketish vaqti (SS:DD)"${dis}></td>
    <td class="mono">${a.worked != null ? `${fmtDur(a.worked)}${a.live ? `<div class="sub">hozirgacha</div>` : ""}` : "—"}</td>
    <td><span class="status t-${a.tone}"><span class="dot dot-${a.dot}"></span>${esc(a.label)}</span></td>
    ${btnCol ? `<td class="act">${!a.in ? `<button type="button" class="btn tiny" data-action="check-in" data-id="${esc(p.id)}">Keldi</button>` : !a.out ? `<button type="button" class="btn tiny" data-action="check-out" data-id="${esc(p.id)}">Ketdi</button>` : ""}</td>` : ""}
  </tr>`;
}
function attMonthHTML(m) {
  const today = todayStr(); const [y, mo] = m.split("-").map(Number); const last = new Date(y, mo, 0).getDate();
  const days = []; for (let d = 1; d <= last; d++) { const ds = `${m}-${pad(d)}`; if (ds > today) break; days.push(ds); }
  if (!days.length) return `<p class="note">Bu oy hali boshlanmagan.</p>`;
  const work = days.filter(isWorkday);
  const avg = arr => arr.length ? fromMin(Math.round(arr.reduce((x, y) => x + y, 0) / arr.length)) : "—";
  const rowsHTML = [];
  branches().forEach(b => depts(b.id).forEach(d => {
    const ppl = staffOf(d.id); if (!ppl.length) return;
    const stats = ppl.map(p => {
      let present = 0, absent = 0, lateN = 0, total = 0, ins = [], outs = [];
      days.forEach(ds => {
        const a = attInfo(p, ds); const i = toMin(a.in), o = toMin(a.out);
        if (i != null) { present++; ins.push(i); if (a.late) lateN++; }
        if (a.key === "absent") absent++;
        if (i != null && o != null) { total += Math.max(0, o - i); outs.push(o); }
      });
      return { p, present, absent, lateN, total, ins, outs, avgIn: avg(ins), avgOut: avg(outs) };
    });
    const sumP = stats.reduce((x, s) => x + s.present, 0), sumL = stats.reduce((x, s) => x + s.lateN, 0), sumT = stats.reduce((x, s) => x + s.total, 0), sumA = stats.reduce((x, s) => x + s.absent, 0);
    rowsHTML.push(`<tr class="grp"><td>${esc(d.name)} <span class="branch-tag" style="margin-left:6px">${esc(b.name)}</span> <span class="muted mono" style="font-weight:500;font-size:12.5px;margin-left:6px">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span></td><td class="num">${sumP} / ${work.length * ppl.length}</td><td class="num">${sumA || "—"}</td><td class="num">${sumL || "—"}</td><td class="num">${fmtDur(sumT)}</td><td class="num">${avg(stats.flatMap(s => s.ins))}</td><td class="num">${avg(stats.flatMap(s => s.outs))}</td></tr>`);
    stats.forEach(s => rowsHTML.push(`<tr><td>${esc(s.p.name)}${s.p.role ? `<div class="sub">${esc(s.p.role)}</div>` : ""}</td><td class="num">${s.present} / ${work.length}</td><td class="num">${s.absent || "—"}</td><td class="num">${s.lateN || "—"}</td><td class="num">${fmtDur(s.total)}</td><td class="num">${s.avgIn}</td><td class="num">${s.avgOut}</td></tr>`));
  }));
  return `<p class="muted" style="margin:0 0 10px">${esc(fmtMonth(m))}: ${days.length} kun hisobga olindi, shundan ${work.length} tasi ish kuni. Yashil qatorda bo'lim bo'yicha jami va o'rtacha ko'rsatkichlar, yonida bo'limning belgilangan ish vaqti.</p>
  <div class="report-wrap"><table class="report"><thead><tr><th scope="col">Bo'lim / xodim</th><th scope="col" class="num">Kelgan kunlar</th><th scope="col" class="num">Kelmagan</th><th scope="col" class="num">Kechikishlar</th><th scope="col" class="num">Jami ishlagan</th><th scope="col" class="num">O'rtacha kelish</th><th scope="col" class="num">O'rtacha ketish</th></tr></thead><tbody>${rowsHTML.join("") || `<tr><td colspan="7" class="muted">Xodimlar yo'q.</td></tr>`}</tbody></table></div>`;
}

/* ----- Sozlamalar ----- */
function viewSettings() {
  if (!S.loaded.org) return loadingBlock();
  const ro = !(S.canAdmin && S.conn === "live"), dis = ro ? " disabled" : "";
  const bl = branches(), st = settings();
  const demoStaff = Object.values(S.org.staff).filter(p => p.demo).length;
  const demoTasks = tasks().filter(t => t.demo).length;
  return `
  <div class="view-head"><h2>Sozlamalar</h2><p>Tarmoqlar, bo'limlar, xodimlar va davomat qoidalari. Bu yerdagi o'zgarishlar sxemada darhol ko'rinadi.</p></div>
  ${ro && S.conn === "live" ? `<p class="note">Tuzilmani faqat sahifa egasi va tahrirlovchilar o'zgartira oladi.</p>` : ""}
  <div class="settings-grid">
    <section class="panel wide">
      <h3>Bo'limlar va xodimlar</h3>
      <div class="set-branches">${bl.map(b => `<div class="set-branch"><h4>${esc(b.name)}</h4>
        ${depts(b.id).map((d, i, arr) => `<div class="set-dept">
          <div class="set-dept-head"><span class="dept-tab sm">${esc(d.name)}</span><span class="mono muted">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span>
            ${ro ? "" : `<span class="set-actions"><button type="button" class="icon-btn sm" data-action="move-dept" data-id="${esc(d.id)}" data-dir="-1" aria-label="${esc(d.name)}: yuqoriga"${i === 0 ? " disabled" : ""}>↑</button><button type="button" class="icon-btn sm" data-action="move-dept" data-id="${esc(d.id)}" data-dir="1" aria-label="${esc(d.name)}: pastga"${i === arr.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="btn tiny ghost" data-action="edit-dept" data-id="${esc(d.id)}">Tahrirlash</button><button type="button" class="btn tiny" data-action="new-staff" data-dept="${esc(d.id)}">+ Xodim</button></span>`}
          </div>
          <ol class="set-staff">${staffOf(d.id).map((p, j, arr2) => `<li><div><span>${esc(p.name)}</span>${p.role ? `<span class="muted">${esc(p.role)}</span>` : ""}${p.demo ? `<span class="tag">namuna</span>` : ""}${ro ? "" : `<span class="set-actions"><button type="button" class="icon-btn sm" data-action="move-staff" data-id="${esc(p.id)}" data-dir="-1" aria-label="${esc(p.name)}: yuqoriga"${j === 0 ? " disabled" : ""}>↑</button><button type="button" class="icon-btn sm" data-action="move-staff" data-id="${esc(p.id)}" data-dir="1" aria-label="${esc(p.name)}: pastga"${j === arr2.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="btn tiny ghost" data-action="edit-staff" data-id="${esc(p.id)}">Tahrirlash</button></span>`}</div></li>`).join("") || `<li class="muted">Xodim yo'q</li>`}</ol>
        </div>`).join("")}
        ${ro ? "" : `<button type="button" class="btn tiny" data-action="new-dept" data-branch="${esc(b.id)}" style="justify-self:start">+ Bo'lim qo'shish (${esc(b.name)})</button>`}
      </div>`).join("") || `<p class="muted">Tarmoq yo'q.</p>`}</div>
    </section>
    <section class="panel">
      <h3>Tarmoqlar</h3>
      <p class="muted">Sxemadagi asosiy bloklar. Juft tartibdagi tarmoq sxemada o'ng tomonda, ko'zgu ko'rinishida chiziladi.</p>
      <ul class="plain">${bl.map(b => `<li class="row"><label class="sr" for="br-${esc(b.id)}">Tarmoq nomi</label><input type="text" id="br-${esc(b.id)}" value="${esc(b.name)}" data-change="branch-name" data-id="${esc(b.id)}" maxlength="24"${dis}><span class="muted">${depts(b.id).length} bo'lim</span>${!ro && !depts(b.id).length ? `<button type="button" class="btn tiny danger" data-action="del-branch" data-id="${esc(b.id)}">O'chirish</button>` : ""}</li>`).join("")}</ul>
      ${ro ? "" : `<button type="button" class="btn tiny" data-action="add-branch" style="justify-self:start">+ Tarmoq qo'shish</button>`}
    </section>
    <section class="panel">
      <h3>Davomat qoidalari</h3>
      <label class="field"><span>Kechikish hisoblanmaydigan vaqt, daqiqa</span><input type="number" id="set-grace" min="0" max="120" step="1" value="${st.grace}" data-change="set-grace"${dis}></label>
      <fieldset class="field"><legend>Ish kunlari</legend><div class="wd-picks">${WD_ORDER.map(w => `<label class="pick"><input type="checkbox" value="${w}" data-change="set-wd"${st.workDays.includes(w) ? " checked" : ""}${dis}><span>${WD_LONG[w]}</span></label>`).join("")}</div></fieldset>
    </section>
    ${demoStaff || demoTasks ? `<section class="panel">
      <h3>Namuna ma'lumotlar</h3>
      <p>Dastur bilan tanishish uchun ${demoStaff} ta namuna xodim, ${demoTasks} ta namuna task va ularning davomati kiritilgan. Siz tahrirlagan yozuvlar namuna hisoblanmaydi va o'chirilmaydi.</p>
      ${ro ? "" : `<button type="button" class="btn danger" data-action="clear-demo" style="justify-self:start">Namunalarni o'chirish</button>`}
    </section>` : ""}
  </div>`;
}


/* ----- Qo'llanma ----- */
function viewHelp() {
  const card = (n, title, items, href, label) => `<article class="help-card"><span class="num-badge">${n}</span><h3>${title}</h3><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>${href ? `<a class="btn" href="${href}">${label}</a>` : ""}</article>`;
  return `
  <div class="view-head"><h2>Qanday foydalaniladi</h2><p>Dastur beshta bo'limdan iborat. Har birini bir daqiqada tushunib olasiz. Yuqoridagi menyu orqali istalgan bo'limga o'tish mumkin.</p></div>
  <div class="help-grid">
    ${card(1, "Tuzilma", ["Chapda <b>B2B</b>, o'ngda <b>B2C</b> bo'limlari. Bo'lim nomi ustiga <b>kursorni olib boring</b>: xodimlar ro'yxati ochiladi (telefonda ▾ tugmasini bosing).", "Xodim yonidagi nuqta: <b>yashil</b> ishda, <b>to'q sariq</b> kechikib kelgan, <b>qizil</b> kelmagan.", "O'ngdagi ro'yxatdan <b>taskni bosing</b>: uni bajarayotgan bo'limlar ajralib turadi.", "Bo'lim nomini bossangiz, bo'lim ichiga kirasiz."], "#tuzilma", "Tuzilmani ochish")}
    ${card(2, "Bo'lim ichi", ["Tepada bo'lim xodimlari, ostida ularning <b>tasklari</b>.", "Task bir nechta xodimga tegishli bo'lsa, ularning ustida cho'zilib turadi.", "<b>Keldi</b> va <b>Ketdi</b> tugmalari bilan davomatni belgilash mumkin.", "Chapda shu bo'lim bilan birga ishlayotgan boshqa bo'limlar ko'rinadi."], "", "")}
    ${card("D", "Dashboard", ["<b>Umumiy bajarilish</b> foizi va tasklar holati.", "Har bir bo'lim nechta taskda qatnashayotgani va ularning holati.", "<b>Kunlik davomat</b> grafigi va <b>bo'limlar faolligi</b> reytingi.", "Tepada tarmoq (B2B/B2C) va oyni tanlash mumkin."], "#dashboard", "Dashboardni ochish")}
    ${card(3, "Tasklar", ["Har bir task: qaysi bo'limlar, qaysi xodimlar, <b>muddat</b> va <b>holat</b>.", "Holatni jadvalning o'zida o'zgartirish mumkin.", "<b>Muddatlar grafigi</b> hamma tasklarni vaqt chizig'ida ko'rsatadi.", "Yangi task qo'shish uchun yuqoridagi ko'k tugmani bosing."], "#tasklar", "Tasklarni ochish")}
    ${card(4, "Davomat", ["Har bir bo'lim uchun ish vaqti, kim birinchi kelgan va kim oxirgi ketgan.", "Vaqtni qo'lda yozish mumkin, masalan <b>0845</b> yoki <b>08:45</b>.", "<b>Oylik hisobot</b>: kelgan kunlar, kechikishlar va jami ishlagan soat."], "#davomat", "Davomatni ochish")}
    ${card(5, "Sozlamalar", ["Bo'lim va xodim qo'shish, tahrirlash va o'chirish.", "Bo'limlarning ish vaqti va kechikish hisoblanmaydigan daqiqalar.", "Namuna ma'lumotlarni bir tugma bilan tozalash."], "#sozlamalar", "Sozlamalarni ochish")}
    ${card(6, "Sinab ko'rish rejimi", ["Bu rejimda hamma tugmalarni bemalol bosish mumkin.", "O'zgarishlar faqat sizning oynangizda qoladi va boshqalarga ta'sir qilmaydi.", "Sahifa yangilansa, hammasi asl holatiga qaytadi."], "", "")}
  </div>`;
}


/* ----- Dashboard ----- */
const STATE_ORDER = ["done", "progress", "new", "review", "overdue"];
const ON_LIGHT = { new: true };
function dashData() {
  const today = todayStr(), f = S.dash, m = f.month || monthOf(today);
  const bl = branches();
  const ds = deptsOrdered().filter(d => f.branch === "all" || d.branch === f.branch);
  const dsIds = new Set(ds.map(d => d.id));
  const all = tasks();
  const tl = f.branch === "all" ? all : all.filter(t => (t.deptIds || []).some(id => dsIds.has(id)));
  const counts = { done: 0, progress: 0, new: 0, review: 0, overdue: 0 };
  tl.forEach(t => counts[stateOf(t)]++);
  const total = tl.length, active = tl.filter(t => t.status !== "done");
  const avgProg = total ? Math.round(tl.reduce((s, t) => s + pct(t), 0) / total) : 0;
  const week = active.filter(t => t.due && t.due >= today && t.due <= addDays(today, 7)).length;
  const people = ds.flatMap(d => staffOf(d.id));
  let tp = 0, ta = 0;
  people.forEach(p => { const a = attInfo(p, today); if (a.in) tp++; else if (a.key === "absent") ta++; });
  const [y, mo] = m.split("-").map(Number), last = new Date(y, mo, 0).getDate();
  const days = []; for (let i = 1; i <= last; i++) { const dd = `${m}-${pad(i)}`; if (dd > today) break; days.push(dd); }
  const deptStats = ds.map(d => {
    const ppl = staffOf(d.id); let present = 0, absent = 0, late = 0, minutes = 0;
    for (const day of days) for (const p of ppl) { const a = attInfo(p, day); if (a.in) { present++; if (a.late) late++; if (a.out && a.worked != null) minutes += a.worked; } else if (a.key === "absent") absent++; }
    const dt = all.filter(t => hasDept(t, d.id));
    const sc = { done: 0, progress: 0, new: 0, review: 0, overdue: 0 }; dt.forEach(t => sc[stateOf(t)]++);
    const act = dt.filter(t => t.status !== "done");
    const avg = act.length ? Math.round(act.reduce((s, t) => s + pct(t), 0) / act.length) : null;
    const rate = (present + absent) ? Math.round(present / (present + absent) * 100) : null;
    const score = rate == null ? avg : avg == null ? rate : Math.round((rate + avg) / 2);
    return { d, staff: ppl.length, sc, total: dt.length, active: act.length, avg, rate, present, absent, late, minutes, score };
  });
  const sumP = deptStats.reduce((s, x) => s + x.present, 0), sumA = deptStats.reduce((s, x) => s + x.absent, 0);
  const wdays = days.filter(isWorkday);
  const shown = f.branch === "all" ? bl : bl.filter(b => b.id === f.branch);
  const line = { labels: wdays, series: shown.map(b => {
    const slot = Math.max(0, bl.findIndex(x => x.id === b.id)) % 3;
    const ppl = depts(b.id).flatMap(d => staffOf(d.id));
    return { name: b.name, slot, values: wdays.map(day => { let pr = 0, ab = 0; ppl.forEach(p => { const a = attInfo(p, day); if (a.in) pr++; else if (a.key === "absent") ab++; }); return (pr + ab) ? Math.round(pr / (pr + ab) * 100) : null; }) };
  }) };
  const upcoming = active.filter(t => t.due && t.due <= addDays(today, 14)).sort(byDue).slice(0, 8);
  return { m, counts, total, active: active.length, avgProg, week, people: people.length, cameToday: tp, todayRate: (tp + ta) ? Math.round(tp / (tp + ta) * 100) : null,
    monthRate: (sumP + sumA) ? Math.round(sumP / (sumP + sumA) * 100) : null, lateTotal: deptStats.reduce((s, x) => s + x.late, 0), minutes: deptStats.reduce((s, x) => s + x.minutes, 0),
    deptStats, line, upcoming, monthLoaded: !!S.loaded["att:" + m] };
}
const pctTxt = v => v == null ? "—" : v + "%";
function meterHTML(v, severity) {
  if (v == null) return `<span class="muted">—</span>`;
  const cls = severity ? (v < 60 ? " crit" : v < 80 ? " warn" : "") : "";
  return `<div class="meter-cell"><span class="meter${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></span><span>${v}%</span></div>`;
}
function viewDash() {
  if (!S.loaded.org || !S.loaded.tasks) return loadingBlock();
  if (!S.dash.month) S.dash.month = monthOf(todayStr());
  const D = dashData(); S.dashData = D;
  const f = S.dash, curM = monthOf(todayStr()), mName = fmtMonth(D.m);
  const tile = (label, value, sub, cls = "") => `<div class="dash-tile ${cls}"><span class="dc-label">${esc(label)}</span><b>${esc(value)}</b><span class="dc-sub">${esc(sub)}</span></div>`;
  const present = STATE_ORDER.filter(k => D.counts[k]);
  const seg = present.map(k => { const share = Math.round(D.counts[k] / D.total * 100); return `<span class="blk k-${k}${ON_LIGHT[k] ? " on-light" : ""}" style="flex:${D.counts[k]} 1 0" tabindex="0" data-tip="${esc(STATE_LABEL[k])}" data-tip-value="${D.counts[k]} ta task" data-tip-label="${share}%" data-tip-key="k-${k}" aria-label="${esc(STATE_LABEL[k])}: ${D.counts[k]} ta task, ${share}%"><span class="lbl">${share}%</span></span>`; }).join("");
  const maxT = Math.max(1, ...D.deptStats.map(x => x.total));
  const bars = D.deptStats.map(x => {
    const ks = STATE_ORDER.filter(k => x.sc[k]);
    const rows = JSON.stringify(ks.map(k => [`k-${k}`, `${x.sc[k]} ta`, STATE_LABEL[k]]));
    return `<div class="sbar-row" tabindex="0" data-tip="${esc(x.d.name)} (${esc(branchName(x.d.branch))})" data-tip-rows="${esc(rows)}" aria-label="${esc(x.d.name)}: ${x.total} ta task. ${ks.map(k => `${STATE_LABEL[k]} ${x.sc[k]}`).join(", ")}">
      <span class="sbar-name">${esc(x.d.name)}<small>${esc(branchName(x.d.branch))}</small></span>
      <span class="sbar-track">${x.total ? `<span class="sbar-bar" style="width:${(x.total / maxT * 88).toFixed(2)}%">${ks.map(k => `<span class="seg k-${k}" style="flex:${x.sc[k]} 1 0" data-tip="${esc(x.d.name)} · ${esc(STATE_LABEL[k])}" data-tip-value="${x.sc[k]} ta task" data-tip-key="k-${k}"></span>`).join("")}</span><span class="sbar-val">${x.total}</span>` : `<span class="sbar-empty">Task yo'q</span>`}</span>
    </div>`; }).join("");
  const ranked = D.deptStats.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const lineTable = D.line.labels.map((d, i) => `<tr><td>${esc(fmtDate(d))}</td>${D.line.series.map(s => `<td>${pctTxt(s.values[i])}</td>`).join("")}</tr>`).join("");
  const today = todayStr();
  return `
  <div class="view-head"><h2>Dashboard</h2><p>Tasklar qanday bajarilayotgani va bo'limlar faolligi bir sahifada. Filtrlar sahifadagi barcha ko'rsatkichlarga birdek ta'sir qiladi.</p></div>
  <div class="toolbar dash-filters">
    <div class="seg" role="group" aria-label="Tarmoq">${[["all", "Hammasi"], ...branches().map(b => [b.id, b.name])].map(([v, l]) => `<button type="button" data-action="dash-branch" data-v="${esc(v)}" aria-pressed="${f.branch === v}">${esc(l)}</button>`).join("")}</div>
    <div class="date-nav"><button type="button" class="btn tiny" data-action="dash-month" data-dir="-1" aria-label="Oldingi oy">‹</button><span class="date-label">${esc(mName)}</span><button type="button" class="btn tiny" data-action="dash-month" data-dir="1" aria-label="Keyingi oy"${D.m >= curM ? " disabled" : ""}>›</button></div>
    <span class="muted dash-note">Davomat tanlangan oy bo'yicha, tasklar hozirgi holati bo'yicha.</span>
  </div>
  <section class="dash-top">
    <article class="dash-card hero-card" aria-label="Tasklarning umumiy bajarilishi">
      <span class="dc-label">Tasklarning umumiy bajarilishi</span>
      <span class="hero-num">${D.avgProg}%</span>
      <span class="dc-sub">${D.total} ta taskning o'rtacha bajarilish foizi. ${D.counts.done} tasi to'liq yakunlangan.</span>
      ${D.total ? `<div class="segbar" role="group" aria-label="Tasklar holati bo'yicha taqsimot">${seg}</div>
      <div class="viz-legend">${present.map(k => `<span><i class="key k-${k}"></i>${STATE_LABEL[k]}</span>`).join("")}</div>` : `<p class="muted">Hali task yo'q.</p>`}
    </article>
    <div class="dash-stats">
      ${tile("Faol tasklar", D.active, `${D.counts.progress} jarayonda, ${D.counts.review} tekshiruvda, ${D.counts.new} yangi`)}
      ${tile("Muddati o'tgan", D.counts.overdue, D.counts.overdue ? "Darhol e'tibor kerak" : "Kechikkan task yo'q", D.counts.overdue ? "crit" : "")}
      ${tile("7 kun ichida tugaydi", D.week, "Yaqin muddatlar pastda")}
      ${tile("Bugungi davomat", pctTxt(D.todayRate), `${D.cameToday}/${D.people} xodim keldi`)}
      ${tile("Oylik davomat", pctTxt(D.monthRate), `${mName}, ${D.lateTotal} ta kechikish`)}
      ${tile("Ishlangan soat", `${Math.round(D.minutes / 60)} soat`, `${mName}, kelish-ketish bo'yicha`)}
    </div>
  </section>
  <section class="dash-grid">
    <article class="dash-card span-7">
      <header class="dc-head"><h3>Bo'limlar bo'yicha tasklar</h3><p>Har bir bo'lim qatnashayotgan tasklar holati bilan. Bir nechta bo'lim bajaradigan task har birida hisoblanadi.</p></header>
      <div class="viz-legend">${STATE_ORDER.map(k => `<span><i class="key k-${k}"></i>${STATE_LABEL[k]}</span>`).join("")}</div>
      <div class="sbars">${bars || `<p class="muted">Bo'lim yo'q.</p>`}</div>
    </article>
    <article class="dash-card span-5">
      <header class="dc-head"><h3>Kunlik davomat</h3><p>Ish kunlarida kelgan xodimlar ulushi, ${esc(mName)}.</p></header>
      ${D.line.series.length > 1 ? `<div class="viz-legend">${D.line.series.map(s => `<span><i class="key line k-s${s.slot}"></i>${esc(s.name)}</span>`).join("")}</div>` : ""}
      ${D.monthLoaded || S.conn !== "live" ? `<div class="linechart" id="dash-line" tabindex="0" role="img" aria-label="Kunlik davomat grafigi, ${esc(mName)}. Qiymatlar jadval ko'rinishida ham bor."></div>
      <details class="table-view"><summary>Jadval ko'rinishi</summary><table><thead><tr><th>Sana</th>${D.line.series.map(s => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${lineTable}</tbody></table></details>` : loadingBlock()}
    </article>
    <article class="dash-card span-12">
      <header class="dc-head"><h3>Bo'limlar faolligi</h3><p>Faollik balli: bu oy davomati va faol tasklar o'rtacha bajarilishining o'rtachasi. Faol taski yo'q bo'limda faqat davomat olinadi.</p></header>
      <div class="table-scroll"><table class="activity">
        <thead><tr><th>#</th><th>Bo'lim</th><th class="num">Xodim</th><th class="num">Faol task</th><th class="num">Bajarilgan</th><th>O'rtacha bajarilish</th><th class="num">Muddati o'tgan</th><th>Oylik davomat</th><th class="num">Kechikishlar</th><th class="num">Ishlangan</th><th class="num">Faollik balli</th></tr></thead>
        <tbody>${ranked.map((x, i) => `<tr>
          <td><span class="rank">${i + 1}</span></td>
          <td><a class="chip" href="#bolim-${esc(x.d.id)}">${esc(x.d.name)}<small>${esc(branchName(x.d.branch))}</small></a></td>
          <td class="num">${x.staff}</td><td class="num">${x.active}</td><td class="num">${x.sc.done}</td>
          <td>${meterHTML(x.avg, false)}</td>
          <td class="num">${x.sc.overdue ? `<span class="flag-dot">${x.sc.overdue}</span>` : "—"}</td>
          <td>${meterHTML(x.rate, true)}</td>
          <td class="num">${x.late || "—"}</td>
          <td class="num">${Math.round(x.minutes / 60)} s</td>
          <td class="num"><span class="score">${x.score ?? "—"}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </article>
    <article class="dash-card span-12">
      <header class="dc-head"><h3>Yaqin muddatlar</h3><p>Muddati o'tgan va keyingi 14 kunda tugaydigan tasklar.</p></header>
      ${D.upcoming.length ? `<ul class="upcoming">${D.upcoming.map(t => { const st = stateOf(t), info = dueInfo(t), dt = parseYmd(t.due); return `<li>
        <span class="cal"><b>${dt.getDate()}</b><small>${esc(MONTHS[dt.getMonth()].slice(0, 3))}</small></span>
        <span class="up-main"><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="chips">${tDepts(t).map(d => `<span class="chip">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span>`).join("")}</span></span>
        <span class="up-side"><span class="pill s-${st}">${STATE_LABEL[st]}</span><span class="due ${info.cls}">${esc(info.text)}</span></span>
      </li>`; }).join("")}</ul>` : `<p class="muted">Yaqin ikki haftada tugaydigan task yo'q.</p>`}
    </article>
  </section>`;
}
function drawLine(el, data) {
  const n = data.labels.length;
  if (!n || !data.series.length) { el.innerHTML = `<p class="muted" style="margin:16px 0">Bu oyda hali ish kuni yo'q.</p>`; el._geo = null; return; }
  const W = Math.max(300, Math.floor(el.clientWidth)), H = 236, m = { l: 40, r: 78, t: 12, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X = i => m.l + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const Y = v => m.t + ih - v / 100 * ih;
  let g = "";
  [25, 50, 75, 100].forEach(v => { g += `<line class="lc-grid" x1="${m.l}" x2="${m.l + iw}" y1="${Y(v)}" y2="${Y(v)}"/>`; });
  g += `<line class="lc-base" x1="${m.l}" x2="${m.l + iw}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  [0, 25, 50, 75, 100].forEach(v => { g += `<text class="lc-tick" x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`; });
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 40))));
  const lastShown = Math.floor((n - 1) / step) * step;
  data.labels.forEach((d, i) => { if (i % step === 0 || (i === n - 1 && n - 1 - lastShown >= Math.ceil(step / 2))) g += `<text class="lc-tick" x="${X(i)}" y="${H - 8}" text-anchor="middle">${parseYmd(d).getDate()}</text>`; });
  const ends = [];
  data.series.forEach(s => {
    let d = "", pen = false;
    s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
    g += `<path class="lc-line lc-s${s.slot}" d="${d}"/>`;
    s.values.forEach((v, i) => { if (v != null && s.values[i - 1] == null && s.values[i + 1] == null) g += `<circle class="lc-d${s.slot}" cx="${X(i)}" cy="${Y(v)}" r="3"/>`; });
    let li = -1; for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] != null) { li = i; break; }
    if (li >= 0) ends.push({ s, x: X(li), y: Y(s.values[li]), v: s.values[li] });
  });
  ends.forEach(e => { g += `<circle class="lc-dot lc-d${e.s.slot}" cx="${e.x}" cy="${e.y}" r="4"/>`; });
  const collide = ends.some((a, i) => ends.some((b, j) => j > i && Math.abs(a.y - b.y) < 15));
  if (!collide) ends.forEach(e => { g += `<text class="lc-end" x="${e.x + 10}" y="${e.y + 4}">${esc(e.s.name)} ${e.v}%</text>`; });
  g += `<line class="lc-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/><g class="lc-hover"></g>`;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
  el._geo = { X, Y, n, m, iw, data };
  if (el._idx != null && el._idx >= n) el._idx = n - 1;
}
const vizTip = document.getElementById("viz-tip");
function showTip(x, y, title, rows) {
  vizTip.textContent = "";
  const t = document.createElement("div"); t.className = "tt-title"; t.textContent = title; vizTip.appendChild(t);
  rows.forEach(r => {
    const row = document.createElement("div"); row.className = "tt-row";
    const k = document.createElement("span"); k.className = `tt-key ${r.box ? "box " : ""}${r.key || ""}`;
    const b = document.createElement("b"); b.textContent = r.value;
    const l = document.createElement("span"); l.textContent = r.label || "";
    row.append(k, b, l); vizTip.appendChild(row);
  });
  vizTip.classList.add("show");
  const w = vizTip.offsetWidth, h = vizTip.offsetHeight;
  let left = x + 14, top = y + 14;
  if (left + w > innerWidth - 8) left = x - w - 14;
  if (top + h > innerHeight - 8) top = y - h - 14;
  vizTip.style.left = Math.max(8, left) + "px"; vizTip.style.top = Math.max(8, top) + "px";
}
function hideTip() { vizTip.classList.remove("show"); }
function tipFor(el, x, y) {
  let rows;
  if (el.dataset.tipRows) { try { rows = JSON.parse(el.dataset.tipRows).map(([key, value, label]) => ({ key, value, label, box: true })); } catch (e) { rows = []; } }
  else rows = [{ key: el.dataset.tipKey, value: el.dataset.tipValue || "", label: el.dataset.tipLabel || "", box: true }];
  showTip(x, y, el.dataset.tip, rows);
}
let activeLine = null;
function lineAt(el, i, x, y) {
  const g = el._geo; if (!g) return;
  i = clamp(i, 0, g.n - 1); el._idx = i;
  const svg = el.querySelector("svg"), cross = svg.querySelector(".lc-cross"), hov = svg.querySelector(".lc-hover");
  cross.setAttribute("x1", g.X(i)); cross.setAttribute("x2", g.X(i)); cross.setAttribute("visibility", "visible");
  hov.innerHTML = g.data.series.map(s => s.values[i] == null ? "" : `<circle class="lc-dot lc-d${s.slot}" cx="${g.X(i)}" cy="${g.Y(s.values[i])}" r="4.5"/>`).join("");
  const d = g.data.labels[i];
  if (x == null) { const r = svg.getBoundingClientRect(); x = r.left + g.X(i); y = r.top + g.m.t + 10; }
  showTip(x, y, `${WD_LONG[parseYmd(d).getDay()]}, ${fmtDate(d)}`, g.data.series.map(s => ({ key: `k-s${s.slot}`, value: pctTxt(s.values[i]), label: s.name })));
  activeLine = el;
}
function clearLine() {
  if (!activeLine) return;
  const svg = activeLine.querySelector("svg");
  if (svg) { svg.querySelector(".lc-cross")?.setAttribute("visibility", "hidden"); const h = svg.querySelector(".lc-hover"); if (h) h.innerHTML = ""; }
  activeLine = null; hideTip();
}
document.addEventListener("pointermove", e => {
  const lc = e.target.closest && e.target.closest(".linechart");
  if (lc && lc._geo) {
    const g = lc._geo, r = lc.querySelector("svg").getBoundingClientRect();
    const px = e.clientX - r.left;
    if (px >= g.m.l - 12 && px <= g.m.l + g.iw + 12) { lineAt(lc, g.n === 1 ? 0 : Math.round((px - g.m.l) / (g.iw / (g.n - 1))), e.clientX, e.clientY); return; }
  }
  if (activeLine && !(lc && lc === activeLine && document.activeElement === lc)) clearLine();
  const el = e.target.closest && e.target.closest("[data-tip]");
  if (el) tipFor(el, e.clientX, e.clientY);
  else if (!activeLine && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tip)) hideTip();
});
document.addEventListener("focusin", e => {
  const el = e.target;
  if (el.classList && el.classList.contains("linechart") && el._geo) { lineAt(el, el._idx ?? el._geo.n - 1); return; }
  if (el.dataset && el.dataset.tip) { const r = el.getBoundingClientRect(); tipFor(el, r.left + Math.min(r.width / 2, 120), r.bottom - 6); }
});
document.addEventListener("focusout", e => { if (e.target === activeLine) clearLine(); else if (e.target.dataset && e.target.dataset.tip) hideTip(); });
document.addEventListener("keydown", e => {
  const el = e.target;
  if (el.classList && el.classList.contains("linechart") && el._geo && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); lineAt(el, (el._idx ?? el._geo.n - 1) + (e.key === "ArrowRight" ? 1 : -1)); }
});
addEventListener("scroll", () => { if (vizTip.classList.contains("show")) { clearLine(); hideTip(); } }, { passive: true });
function railState() {
  const l = document.getElementById("rail-list"), w = document.getElementById("rail-wrap"), d = document.getElementById("rail-dots");
  if (!l || !w) return;
  const max = l.scrollWidth - l.clientWidth;
  w.classList.toggle("at-start", l.scrollLeft <= 4);
  w.classList.toggle("at-end", l.scrollLeft >= max - 4);
  if (d) {
    const pages = max > 4 ? Math.ceil(l.scrollWidth / l.clientWidth) : 0;
    if (d.childElementCount !== pages) d.innerHTML = "<i></i>".repeat(pages);
    const cur = pages ? Math.round(l.scrollLeft / Math.max(1, max) * (pages - 1)) : 0;
    [...d.children].forEach((i, k) => i.classList.toggle("on", k === cur));
  }
}
document.addEventListener("scroll", e => { if (e.target && e.target.id === "rail-list") railState(); }, true);
addEventListener("resize", () => railState());
function postRender() {
  railState();
  if (S.view !== "dashboard") return;
  activeLine = null; hideTip();
  const el = document.getElementById("dash-line");
  if (el && S.dashData) drawLine(el, S.dashData.line);
  $$(".segbar .blk").forEach(b => { const l = b.querySelector(".lbl"); if (l) l.style.visibility = (l.scrollWidth + 14 <= b.clientWidth) ? "visible" : "hidden"; });
}


/* ----- fon rejimi: kunduzgi / kechki / avto ----- */
function applyMode(mode) {
  if (mode === "day" || mode === "night") document.documentElement.setAttribute("data-mode", mode);
  else { mode = "auto"; document.documentElement.removeAttribute("data-mode"); }
  document.querySelectorAll("[data-mode-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modeSet === mode)));
  try { localStorage.setItem("jb-mode", mode); } catch (e) {}
}
(function () { let m = "auto"; try { m = localStorage.getItem("jb-mode") || "auto"; } catch (e) {} applyMode(m); })();
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-mode-set]"); if (b) applyMode(b.dataset.modeSet); });

/* ----- neon background (Sony-style light ribbons) ----- */
function startWaves() {
  const c = document.getElementById("bg-waves"); if (!c || !c.getContext) return;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, cfg = null, last = 0, slow = 0, frames = 0, stopped = false;
  const readCfg = () => { const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim(); cfg = { c: [v("--wave-1"), v("--wave-2"), v("--wave-3")], a: parseFloat(v("--wave-alpha")) || .3, dark: v("--wave-mode") === "dark" }; };
  const resize = () => { const k = .75; W = innerWidth; H = innerHeight; c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k)); ctx.setTransform(k, 0, 0, k, 0, 0); };
  const ribbons = [
    { y: .24, amp: .085, f: 1.1, sp: .05, ci: 0, n: 26, spread: 70, ph: 0 },
    { y: .56, amp: .11, f: .8, sp: .035, ci: 1, n: 26, spread: 92, ph: 2.1 },
    { y: .82, amp: .07, f: 1.5, sp: .065, ci: 2, n: 20, spread: 58, ph: 4.2 }
  ];
  const draw = t => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = cfg.dark ? "lighter" : "source-over";
    ctx.lineWidth = 1.1;
    const time = t / 1000;
    for (const r of ribbons) for (let k = 0; k < r.n; k++) {
      const u = k / (r.n - 1) - .5;
      ctx.strokeStyle = `rgba(${cfg.c[r.ci]}, ${(cfg.a * (.22 + .78 * (1 - Math.abs(u) * 2))).toFixed(3)})`;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 14) {
        const p = x / W * Math.PI * 2 * r.f + time * r.sp * 6 + r.ph;
        const yy = H * r.y + Math.sin(p + u * .9) * H * r.amp * (1 + u * .6) + Math.sin(p * .5 + time * r.sp * 3) * H * .03 + u * r.spread;
        if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  };
  const loop = t => {
    if (stopped) return;
    const dt = t - last;
    if (dt >= 45) {
      last = t; draw(t); frames++;
      if (frames > 15 && dt > 110 && dt < 1000) slow++;
      if (slow > 12) { stopped = true; return; }
    }
    requestAnimationFrame(loop);
  };
  readCfg(); resize(); draw(performance.now());
  addEventListener("resize", () => { resize(); draw(performance.now()); });
  const themeChange = () => { readCfg(); draw(performance.now()); };
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeChange); } catch (e) {}
  try { new MutationObserver(themeChange).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode", "class", "style"] }); } catch (e) {}
  if (!reduce) requestAnimationFrame(loop);
}

/* ================= modals ================= */
const dlg = document.getElementById("modal");
function showModal(html) {
  dlg.innerHTML = html;
  if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
  const f = dlg.querySelector("[autofocus]") || dlg.querySelector("input:not([type=hidden]):not([disabled]), select, textarea");
  if (f) f.focus();
}
function closeModal() { if (dlg.open) { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } } dlg.innerHTML = ""; }
dlg.addEventListener("close", () => { dlg.innerHTML = ""; });
dlg.addEventListener("click", e => { if (e.target === dlg) closeModal(); });
const mHead = title => `<header class="m-head"><h2 id="m-title">${esc(title)}</h2><button type="button" class="icon-btn" data-action="close-modal" aria-label="Yopish">×</button></header>`;
function setErr(msg) { const el = dlg.querySelector(".m-error"); if (el) el.textContent = msg; }

function openTaskModal(id, preset = {}) {
  if (!Object.keys(S.org.departments).length) { toast("Avval Sozlamalarda bo'lim qo'shing", "crit"); return; }
  const ex = id ? S.tasks[id] : null;
  if (id && !ex) return;
  const t = ex ? { ...ex, id } : { title: "", desc: "", deptIds: preset.deptIds || [], staffIds: [], start: todayStr(), due: addDays(todayStr(), 7), status: "new", progress: 0 };
  const ro = !(S.canWrite && S.conn === "live"), dis = ro ? " disabled" : "";
  const deptSet = new Set(t.deptIds || []);
  const st = id ? stateOf({ ...t }) : "new";
  showModal(`<form class="modal-form" data-form="task" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? (ro ? "Task" : "Taskni tahrirlash") : "Yangi task")}
    <div class="m-body">
      ${id ? `<div class="m-summary"><span class="pill s-${st}">${STATE_LABEL[st]}</span><span><b>${tDepts(t).length} ta bo'lim</b> bajarmoqda:</span>${tDepts(t).map(d => `<span class="chip">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span>`).join("")}<span class="due ${dueInfo(t).cls}">${esc(dueInfo(t).text)}</span></div>` : ""}
      <label class="field"><span>Task nomi</span><input type="text" id="f-title" maxlength="140" value="${esc(t.title)}" placeholder="Masalan: 2-obyektga material yetkazish"${dis} autofocus></label>
      <label class="field"><span>Tavsif</span><textarea id="f-desc" rows="2" maxlength="600" placeholder="Qisqacha nima qilinadi"${dis}>${esc(t.desc || "")}</textarea></label>
      <fieldset class="field"><legend>Qaysi bo'limlar bajaradi</legend>
        ${branches().map(b => depts(b.id).length ? `<div class="pick-group"><span class="pg-name">${esc(b.name)}</span><div class="picks">${depts(b.id).map(d => `<label class="pick"><input type="checkbox" name="dept" value="${esc(d.id)}" data-change="pick-dept"${deptSet.has(d.id) ? " checked" : ""}${dis}><span>${esc(d.name)}</span></label>`).join("")}</div></div>` : "").join("")}
      </fieldset>
      <fieldset class="field"><legend>Mas'ul xodimlar <span style="font-weight:400">(belgilanmasa, butun bo'lim mas'ul)</span></legend><div id="staff-picks"></div></fieldset>
      <div class="field-row">
        <label class="field"><span>Boshlanish sanasi</span><input type="date" id="f-start" value="${esc(t.start || "")}"${dis}></label>
        <label class="field"><span>Yakunlanish muddati</span><input type="date" id="f-due" value="${esc(t.due || "")}"${dis}></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Holat</span><select id="f-status"${dis}>${EDIT_STATUSES.map(s => `<option value="${s}"${t.status === s ? " selected" : ""}>${STATE_LABEL[s]}</option>`).join("")}</select></label>
        <div class="field"><span>Bajarilish: <output id="f-pct-out" for="f-pct">${pct(t)}%</output></span><div class="range-row"><input type="range" id="f-pct" min="0" max="100" step="5" value="${pct(t)}" aria-label="Bajarilish foizi"${dis}></div></div>
      </div>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">
      ${id && !ro ? `<button type="button" class="btn danger ghost" data-action="delete-task" data-id="${esc(id)}">O'chirish</button>` : ""}
      ${id ? `<button type="button" class="btn ghost" data-action="focus-from-modal" data-id="${esc(id)}">Sxemada ko'rsatish</button>` : ""}
      <span class="spacer"></span>
      <button type="button" class="btn ghost" data-action="close-modal">${ro ? "Yopish" : "Bekor qilish"}</button>
      ${ro ? "" : `<button type="submit" class="btn primary">Saqlash</button>`}
    </footer>
  </form>`);
  renderStaffPicks(t.staffIds || []);
}
function renderStaffPicks(initial) {
  const box = dlg.querySelector("#staff-picks"); if (!box) return;
  const ro = !(S.canWrite && S.conn === "live"), dis = ro ? " disabled" : "";
  const chosen = $$('input[name="dept"]:checked', dlg).map(i => i.value);
  const prev = new Set(initial || $$('input[name="staff"]:checked', box).map(i => i.value));
  if (!chosen.length) { box.innerHTML = `<p class="muted" style="margin:0;font-size:13.5px">Avval bo'limni tanlang.</p>`; return; }
  box.innerHTML = chosen.map(id => { const d = getDept(id); if (!d) return ""; const ppl = staffOf(id);
    return `<div class="pick-group"><span class="pg-name">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span><div class="picks">${ppl.length ? ppl.map(p => `<label class="pick staff"><input type="checkbox" name="staff" value="${esc(p.id)}"${prev.has(p.id) ? " checked" : ""}${dis}><span>${esc(p.name)}</span></label>`).join("") : `<span class="muted" style="font-size:13px">Bu bo'limda xodim yo'q</span>`}</div></div>`; }).join("");
}
async function saveTask(form) {
  const id = form.dataset.id || uid("t");
  const ex = S.tasks[id];
  const title = $("#f-title", dlg).value.trim();
  const desc = $("#f-desc", dlg).value.trim();
  const staffIds = $$('input[name="staff"]:checked', dlg).map(i => i.value);
  const deptIds = [...new Set($$('input[name="dept"]:checked', dlg).map(i => i.value).concat(staffIds.map(pid => getPerson(pid)?.deptId).filter(Boolean)))];
  const start = $("#f-start", dlg).value, due = $("#f-due", dlg).value;
  const status = $("#f-status", dlg).value;
  let progress = num($("#f-pct", dlg).value);
  if (!title) return setErr("Task nomini yozing.");
  if (!deptIds.length) return setErr("Kamida bitta bo'limni tanlang.");
  if (!due) return setErr("Yakunlanish muddatini belgilang.");
  if (start && start > due) return setErr("Boshlanish sanasi muddatdan keyin bo'lishi mumkin emas.");
  if (status === "done") progress = 100;
  const data = { ...(ex || {}), title, desc, deptIds, staffIds, start: start || due, due, status, progress, updatedAt: iso(), createdAt: ex?.createdAt || iso(), doneAt: status === "done" ? (ex?.doneAt || todayStr()) : "", demo: false };
  const btn = form.querySelector('button[type="submit"]'); if (btn) btn.disabled = true;
  const ok = await dbSet(`tasks/${id}`, data);
  if (btn) btn.disabled = false;
  if (ok) { closeModal(); toast(ex ? "Task saqlandi" : "Yangi task qo'shildi"); }
}

function openStaffModal(id, deptId) {
  const ex = id ? getPerson(id) : null;
  const p = ex || { name: "", role: "", deptId: deptId || deptsOrdered()[0]?.id, phone: "" };
  showModal(`<form class="modal-form" data-form="staff" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Xodimni tahrirlash" : "Yangi xodim")}
    <div class="m-body">
      <label class="field"><span>Ism familiya</span><input type="text" id="s-name" maxlength="60" value="${esc(p.name)}" autofocus></label>
      <label class="field"><span>Lavozim</span><input type="text" id="s-role" maxlength="60" value="${esc(p.role || "")}" placeholder="Masalan: Menejer"></label>
      <label class="field"><span>Bo'lim</span><select id="s-dept">${branches().map(b => `<optgroup label="${esc(b.name)}">${depts(b.id).map(d => `<option value="${esc(d.id)}"${p.deptId === d.id ? " selected" : ""}>${esc(d.name)} (${esc(b.name)})</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="field"><span>Telefon (ixtiyoriy)</span><input type="text" id="s-phone" maxlength="30" value="${esc(p.phone || "")}" inputmode="tel"></label>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="delete-staff" data-id="${esc(id)}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`);
}
async function saveStaff(form) {
  const id = form.dataset.id || uid("p");
  const ex = getPerson(form.dataset.id);
  const name = $("#s-name", dlg).value.trim(), role = $("#s-role", dlg).value.trim(), deptId = $("#s-dept", dlg).value, phone = $("#s-phone", dlg).value.trim();
  if (!name) return setErr("Xodimning ismini yozing.");
  if (!deptId) return setErr("Bo'limni tanlang.");
  const order = ex && ex.deptId === deptId ? num(ex.order) : staffOf(deptId).reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const ok = await orgUpdate({ staff: { [id]: { name, role, deptId, phone, order, demo: false } } });
  if (ok) { closeModal(); toast(ex ? "Xodim saqlandi" : "Xodim qo'shildi"); }
}

function openDeptModal(id, branchId) {
  const ex = id ? getDept(id) : null;
  const d = ex || { name: "", branch: branchId || branches()[0]?.id, workStart: "09:00", workEnd: "18:00" };
  const n = id ? staffOf(id).length : 0;
  showModal(`<form class="modal-form" data-form="dept" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Bo'limni tahrirlash" : "Yangi bo'lim")}
    <div class="m-body">
      <label class="field"><span>Bo'lim nomi</span><input type="text" id="d-name" maxlength="28" value="${esc(d.name)}" placeholder="Masalan: Sales" autofocus></label>
      <label class="field"><span>Tarmoq</span><select id="d-branch">${branches().map(b => `<option value="${esc(b.id)}"${d.branch === b.id ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>
      <div class="field-row">
        <label class="field"><span>Ish boshlanishi (SS:DD)</span><input type="text" class="mono" inputmode="numeric" maxlength="5" placeholder="09:00" id="d-start" value="${esc(d.workStart || "09:00")}"></label>
        <label class="field"><span>Ish tugashi (SS:DD)</span><input type="text" class="mono" inputmode="numeric" maxlength="5" placeholder="18:00" id="d-end" value="${esc(d.workEnd || "18:00")}"></label>
      </div>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="delete-dept" data-id="${esc(id)}" data-n="${n}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`);
}
async function saveDept(form) {
  const exId = form.dataset.id; const ex = exId ? getDept(exId) : null;
  const name = $("#d-name", dlg).value.trim(), branch = $("#d-branch", dlg).value;
  const workStart = normTime($("#d-start", dlg).value || "09:00"), workEnd = normTime($("#d-end", dlg).value || "18:00");
  if (!name) return setErr("Bo'lim nomini yozing.");
  if (!branch) return setErr("Tarmoqni tanlang.");
  if (!workStart || !workEnd) return setErr("Ish vaqtini SS:DD ko'rinishida yozing, masalan 09:00.");
  if (toMin(workStart) >= toMin(workEnd)) return setErr("Ish tugash vaqti boshlanishidan keyin bo'lishi kerak.");
  let id = exId;
  if (!id) { id = `${slug(branch)}-${slug(name)}`; if (S.org.departments[id]) id = `${id}-${Math.random().toString(36).slice(2, 5)}`; }
  const order = ex && ex.branch === branch ? num(ex.order) : depts(branch).reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const ok = await orgUpdate({ departments: { [id]: { name, branch, workStart, workEnd, order } } });
  if (ok) { closeModal(); toast(ex ? "Bo'lim saqlandi" : "Bo'lim qo'shildi"); }
}

function confirmBox(title, text, okLabel, onOk) {
  showModal(`<form class="modal-form" data-form="confirm" novalidate>
    ${mHead(title)}
    <div class="m-body"><p style="margin:0">${esc(text)}</p></div>
    <footer class="m-foot"><span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal" autofocus>Bekor qilish</button><button type="submit" class="btn primary" style="background:var(--crit);border-color:var(--crit);color:#fff">${esc(okLabel)}</button></footer>
  </form>`);
  confirmFn = onOk;
}
let confirmFn = null;

/* ================= actions ================= */
function toast(msg, tone) { const el = $("#toast"); el.textContent = msg; el.className = "show" + (tone ? " " + tone : ""); clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = ""; }, 2800); }
async function checkInOut(pid, field) {
  const date = todayStr(), t = nowHM(), r = rec(date, pid);
  if (field === "out" && r?.in && toMin(t) < toMin(r.in)) { toast("Ketish vaqti kelish vaqtidan oldin bo'la olmaydi", "crit"); return; }
  const ok = await setAtt(pid, date, field, t);
  if (ok) toast(`${shortName(getPerson(pid)?.name)}: ${field === "in" ? "keldi" : "ketdi"}, ${t}`);
}
async function clearDemo() {
  const demoStaff = Object.entries(S.org.staff).filter(([, p]) => p.demo).map(([id]) => id);
  const demoTasks = tasks().filter(t => t.demo).map(t => t.id);
  for (const id of demoTasks) await dbDelete(`tasks/${id}`);
  if (demoStaff.length) {
    const set = new Set(demoStaff);
    for (const [m, doc] of Object.entries(S.att)) {
      const patch = {};
      for (const [ds, map] of Object.entries(doc?.days || {})) for (const pid of Object.keys(map || {})) if (set.has(pid)) (patch[ds] = patch[ds] || {})[pid] = null;
      if (Object.keys(patch).length) await dbUpdate(`attendance/${m}`, { days: patch });
    }
    await orgUpdate({ staff: Object.fromEntries(demoStaff.map(id => [id, null])) });
  }
  S.focusTask = null;
  toast("Namuna ma'lumotlar o'chirildi");
}
function move(kind, id, dir) {
  if (kind === "dept") {
    const d = getDept(id); if (!d) return; const list = depts(d.branch); const i = list.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const patch = { departments: {} }; list.forEach((x, k) => { patch.departments[x.id] = { order: (k === i ? j : k === j ? i : k) + 1 }; });
    orgUpdate(patch);
  } else {
    const p = getPerson(id); if (!p) return; const list = staffOf(p.deptId); const i = list.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const patch = { staff: {} }; list.forEach((x, k) => { patch.staff[x.id] = { order: (k === i ? j : k === j ? i : k) + 1 }; });
    orgUpdate(patch);
  }
}
const actions = {
  "start-sandbox": () => startSandbox(true, false),
  "rail-scroll": el => { const l = document.getElementById("rail-list"); if (l) l.scrollBy({ left: Number(el.dataset.dir) * l.clientWidth * .85, behavior: "smooth" }); },
  "toggle-dept": el => { const id = el.dataset.id; S.openDept = S.openDept === id ? null : id; syncOpenDept(); },
  "dash-branch": el => { S.dash.branch = el.dataset.v; render(); },
  "dash-month": el => { const [y, mo] = S.dash.month.split("-").map(Number); const m = ymd(new Date(y, mo - 1 + Number(el.dataset.dir), 1)).slice(0, 7); if (m > monthOf(todayStr())) return; S.dash.month = m; ensureMonths(); render(); },
  "exit-sandbox": () => exitSandbox(),
  "dismiss-welcome": () => { try { localStorage.setItem("jb-welcome", "1"); } catch (e) {} S.welcomeHidden = true; render(); },
  "go": el => { location.hash = el.dataset.href; },
  "new-task": el => openTaskModal(null, { deptIds: el.dataset.dept ? [el.dataset.dept] : [] }),
  "open-task": el => openTaskModal(el.dataset.id),
  "focus-task": el => { S.focusTask = S.focusTask === el.dataset.id ? null : el.dataset.id; render(); },
  "focus-from-modal": el => { S.focusTask = el.dataset.id; closeModal(); if (S.view !== "tuzilma") location.hash = "tuzilma"; else render(); window.scrollTo({ top: 0, behavior: "smooth" }); },
  "clear-focus": () => { S.focusTask = null; render(); },
  "close-modal": () => closeModal(),
  "check-in": el => checkInOut(el.dataset.id, "in"),
  "check-out": el => checkInOut(el.dataset.id, "out"),
  "tf-status": el => { S.tf.status = el.dataset.v; render(); },
  "tf-mode": el => { S.tf.mode = el.dataset.v; render(); },
  "att-mode": el => { S.attMode = el.dataset.v; render(); },
  "att-today": () => { S.attDate = todayStr(); ensureMonths(); render(); },
  "att-shift": el => {
    const dir = Number(el.dataset.dir), cur = S.attDate || todayStr();
    if (S.attMode === "month") { const d = parseYmd(cur); d.setDate(1); d.setMonth(d.getMonth() + dir); S.attDate = ymd(d); }
    else S.attDate = addDays(cur, dir);
    ensureMonths(); render();
  },
  "new-staff": el => openStaffModal(null, el.dataset.dept),
  "edit-staff": el => openStaffModal(el.dataset.id),
  "new-dept": el => openDeptModal(null, el.dataset.branch),
  "edit-dept": el => openDeptModal(el.dataset.id),
  "move-dept": el => move("dept", el.dataset.id, Number(el.dataset.dir)),
  "move-staff": el => move("staff", el.dataset.id, Number(el.dataset.dir)),
  "add-branch": () => { const id = uid("br"); const order = branches().reduce((m, b) => Math.max(m, num(b.order)), 0) + 1; orgUpdate({ branches: { [id]: { name: `Tarmoq ${order}`, order } } }); },
  "del-branch": el => { const b = S.org.branches[el.dataset.id]; confirmBox("Tarmoqni o'chirish", `«${b?.name || ""}» tarmog'i o'chiriladi.`, "O'chirish", () => orgUpdate({ branches: { [el.dataset.id]: null } })); },
  "make-template": () => orgUpdate(TEMPLATE).then(ok => ok && toast("Tuzilma yaratildi. Endi xodimlarni qo'shing.")),
  "delete-task": el => { const t = S.tasks[el.dataset.id]; const id = el.dataset.id; confirmBox("Taskni o'chirish", `«${t?.title || ""}» butunlay o'chiriladi.`, "O'chirish", async () => { const ok = await dbDelete(`tasks/${id}`); if (ok) { if (S.focusTask === id) S.focusTask = null; toast("Task o'chirildi"); } }); },
  "delete-staff": el => { const p = getPerson(el.dataset.id); const id = el.dataset.id; confirmBox("Xodimni o'chirish", `${p?.name || ""} ro'yxatdan o'chiriladi. Uning tasklardagi va davomatdagi yozuvlari ko'rinmay qoladi.`, "O'chirish", () => orgUpdate({ staff: { [id]: null } }).then(ok => ok && toast("Xodim o'chirildi"))); },
  "delete-dept": el => { const d = getDept(el.dataset.id); const id = el.dataset.id; const ppl = staffOf(id); confirmBox("Bo'limni o'chirish", `«${d?.name || ""}» bo'limi${ppl.length ? ` va undagi ${ppl.length} ta xodim` : ""} o'chiriladi. Tasklar saqlanadi, lekin bu bo'lim ularda ko'rinmaydi.`, "O'chirish", () => orgUpdate({ departments: { [id]: null }, staff: Object.fromEntries(ppl.map(p => [p.id, null])) }).then(ok => { if (ok) { toast("Bo'lim o'chirildi"); if (S.view === "bolim" && S.deptId === id) location.hash = "tuzilma"; } })); },
  "clear-demo": () => confirmBox("Namunalarni o'chirish", "Namuna xodimlar, namuna tasklar va ularning davomati o'chiriladi. Bo'limlar va siz kiritgan ma'lumotlar qoladi.", "O'chirish", clearDemo)
};
const changes = {
  "tf-dept": el => { S.tf.dept = el.value; render(); },
  "task-status": async el => {
    const id = el.dataset.id, t = S.tasks[id]; if (!t) return;
    const status = el.value, patch = { status, updatedAt: iso(), demo: false, doneAt: status === "done" ? todayStr() : "" };
    if (status === "done") patch.progress = 100;
    if (await dbUpdate(`tasks/${id}`, patch)) toast(`Holat: ${STATE_LABEL[status]}`);
  },
  "att-date": el => { if (!el.value) return; S.attDate = el.value; ensureMonths(); render(); },
  "att-time": async el => {
    const pid = el.dataset.id, field = el.dataset.field, date = S.attDate || todayStr();
    const v = normTime(el.value);
    if (v === null) { toast("Vaqtni SS:DD ko'rinishida yozing, masalan 08:45", "crit"); render(); return; }
    el.value = v;
    const r = rec(date, pid) || {};
    if ((r[field] || "") === v) return;
    const other = field === "in" ? r.out : r.in;
    if (v && other && (field === "in" ? toMin(v) > toMin(other) : toMin(v) < toMin(other))) { toast("Ketish vaqti kelish vaqtidan keyin bo'lishi kerak", "crit"); render(); return; }
    if (await setAtt(pid, date, field, v)) toast("Davomat saqlandi");
  },
  "branch-name": el => { const name = el.value.trim(); if (!name) { render(); return; } orgUpdate({ branches: { [el.dataset.id]: { name } } }); },
  "set-grace": el => { const g = clamp(Math.round(num(el.value)), 0, 120); orgUpdate({ settings: { grace: g } }); },
  "set-wd": () => { const wd = $$('[data-change="set-wd"]:checked').map(i => Number(i.value)); if (!wd.length) { toast("Kamida bitta ish kuni bo'lishi kerak", "crit"); render(); return; } orgUpdate({ settings: { workDays: wd } }); },
  "pick-dept": () => renderStaffPicks(null)
};
const submits = {
  task: saveTask, staff: saveStaff, dept: saveDept,
  confirm: async () => { const fn = confirmFn; confirmFn = null; closeModal(); if (fn) await fn(); }
};
function syncOpenDept() { $$(".dept-node").forEach(n => { const on = n.dataset.dept === S.openDept; n.classList.toggle("open", on); const b = n.querySelector(".node-toggle"); if (b) b.setAttribute("aria-expanded", String(on)); }); }
document.addEventListener("click", e => { if (S.openDept && !e.target.closest(".dept-node.open")) { S.openDept = null; syncOpenDept(); } }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.openDept && !dlg.open) { S.openDept = null; syncOpenDept(); } });
document.addEventListener("click", e => { const el = e.target.closest("[data-action]"); if (!el || el.disabled) return; const fn = actions[el.dataset.action]; if (fn) { e.preventDefault(); fn(el, e); } });
document.addEventListener("change", e => { const el = e.target.closest("[data-change]"); if (!el) return; const fn = changes[el.dataset.change]; if (fn) fn(el, e); });
document.addEventListener("input", e => {
  if (e.target.id === "tq") { S.tf.q = e.target.value; const box = document.getElementById("task-results"); if (box) box.innerHTML = taskResults(); }
  if (e.target.id === "f-pct") { const o = document.getElementById("f-pct-out"); if (o) o.textContent = e.target.value + "%"; }
});
document.addEventListener("submit", e => { const f = e.target; e.preventDefault(); const fn = submits[f.dataset.form]; if (fn) fn(f); });
document.addEventListener("toggle", e => { if (e.target.id === "done-list") S.doneOpen = e.target.open; }, true);
document.addEventListener("keydown", e => {
  const el = e.target.closest && e.target.closest('[data-action="go"]');
  if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = el.dataset.href; }
});

/* ================= routing and boot ================= */
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (h.startsWith("bolim-")) { S.view = "bolim"; S.deptId = h.slice(6); }
  else S.view = VIEWS.includes(h) ? h : "tuzilma";
  render();
}
function tick() {
  if (S.lastMinute === nowHM()) return;
  if (dlg.open) return;
  const ae = document.activeElement;
  if (ae && main().contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
  ensureMonths();
  render();
}
function start(hot) {
  if (hot && typeof hot === "object") {
    if (hot.tf && typeof hot.tf === "object") S.tf = { ...S.tf, ...hot.tf };
    if (typeof hot.attDate === "string") S.attDate = hot.attDate;
    if (hot.attMode === "month" || hot.attMode === "day") S.attMode = hot.attMode;
    if (typeof hot.focusTask === "string") S.focusTask = hot.focusTask;
    S.doneOpen = !!hot.doneOpen;
    if (hot.dash && typeof hot.dash === "object") S.dash = { branch: typeof hot.dash.branch === "string" ? hot.dash.branch : "all", month: typeof hot.dash.month === "string" ? hot.dash.month : null };
  }
  if (!S.attDate) S.attDate = todayStr();
  if (!S.dash.month) S.dash.month = monthOf(todayStr());
  try { startWaves(); } catch (e) {}
  try { let lastW = 0; new ResizeObserver(() => { const w = main().clientWidth; if (w === lastW) return; lastW = w; if (S.view === "dashboard") requestAnimationFrame(postRender); }).observe(main()); } catch (e) {}
  try { window.claude?.hot?.snapshot?.(() => ({ tf: S.tf, attDate: S.attDate, attMode: S.attMode, focusTask: S.focusTask, doneOpen: S.doneOpen, dash: S.dash })); } catch (e) {}
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  route();
  connect();
  setInterval(tick, 20000);
}
const hot = window.claude?.hot;
if (hot && typeof hot.ready === "function") hot.ready(start); else start(hot?.data ?? {});
})();
