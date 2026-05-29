#!/usr/bin/env node
/**
 * Generates Ukraine Geo Quest data: extra rounds + match bank snippet.
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const roundsDir = join(__dirname, "../games/geo-quest/data/rounds");

const EXTRA = {
  lviv: [
    { type: "quiz", text: "Львів заснований князем Данилом Галицьким. Як його називали раніше?", answers: ["Львів", "Київ", "Одеса", "Харків"], correct: 0, explanation: "Місто названо на честь сина Данила — Лева.", wikiUrl: "https://uk.wikipedia.org/wiki/Львів" },
    { type: "quiz", text: "Оперний театр у Львові — один із найкрасивіших в Україні. Де він стоїть?", answers: ["На площі Просвіти", "У Карпатах", "На Дніпрі", "Біля моря"], correct: 0, explanation: "Львівський оперний театр — перлина архітектури на площі Просвіти." },
    { type: "imageQuiz", text: "Обери Львівську ратушу:", answers: [{ image: "https://commons.wikimedia.org/wiki/Special:FilePath/Lviv_Town_Hall.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Kyiv_Maidan_Nezhalezhnosti.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Odessa_Opera_and_Ballet_Theater.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Kharkiv_derzhprom.jpg?width=280" }], correct: 0, explanation: "Ратуша — символ Львова з вежею та годинником." },
    { type: "yesno", text: "Львівська область межує з Польщею.", correct: true, explanation: "Так. Західний кордон України проходить через Карпати." },
    { type: "quiz", text: "Що таке «кава по-львівськи»?", answers: ["Міцна кава з молоком у турці", "Суп", "Салат", "Печиво"], correct: 0, explanation: "У Львові славилися кав'ярні ще з австро-угорських часів." },
    { type: "quiz", text: "Яка річка тече через Львів?", answers: ["Полтва", "Дніпро", "Дунай", "Волга"], correct: 0, explanation: "Полтва — притока Західного Бугу, тече містом." },
    { type: "quiz", text: "Свято «Світло Різдва» у Львові пов'язане з…", answers: ["Фестивалем вертепів і ілюмінацією", "Плаванням у морі", "Збором винограду", "Польотом на повітряній кулі"], correct: 0, explanation: "Львів відомий різдвяними ярмарками та вертепами." },
    { type: "yesno", text: "Площа Ринок у Львові — історичний центр міста.", correct: true, explanation: "Так. Навколо площі — сотні пам'яток архітектури." },
    { type: "quiz", text: "Львівська область славиться…", answers: ["Карпатськими курортами", "Пустелями", "Кораловими рифами", "Вулканами"], correct: 0, explanation: "Славсько, Трускавець — відомі карпатські курорти." },
    { type: "quiz", text: "Який український писемник народився біля Львова?", answers: ["Іван Франко", "Гомер", "Шекспір", "Толстой"], correct: 0, explanation: "Іван Франко — видатний письменник і громадський діяч Галичини." },
  ],
  kyiv: [
    { type: "quiz", text: "Хрещатик — головна вулиця…", answers: ["Києва", "Одеси", "Львова", "Ужгорода"], correct: 0, explanation: "Хрещатик з'єднує центр Києва від Майдану до європейської площі." },
    { type: "imageQuiz", text: "Обери Софійський собор у Києві:", answers: [{ image: "https://commons.wikimedia.org/wiki/Special:FilePath/Saint_Sophia%27s_Cathedral%2C_Kyiv.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Lviv_Town_Hall.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Potemkin_Stairs.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Kamianets_Podilskyi_Castle.jpg?width=280" }], correct: 0, explanation: "Софія Київська — пам'ятка UNESCO, золоті куполи." },
    { type: "yesno", text: "Київ називають «матір міст руських».", correct: true, explanation: "Так. З IX століття Київ — політичний і культурний центр." },
    { type: "quiz", text: "Де розташований Києво-Печерський заповідник?", answers: ["У Києві на пагорбах над Дніпром", "В Карпатах", "На морі", "В степу без річок"], correct: 0, explanation: "Лавра — духовний центр з печерами та соборами." },
    { type: "quiz", text: "Обласний центр Київської області — це…", answers: ["Біла Церква", "Київ", "Бориспіль", "Чернігів"], correct: 0, explanation: "Київ — місто особливого статусу; обласний центр — Біла Церква." },
    { type: "quiz", text: "Монумент «Батьківщина-Мати» стоїть у…", answers: ["Києві", "Львові", "Одесі", "Севастополі"], correct: 0, explanation: "Скульптура на правому березі Дніпра — символ перемоги." },
    { type: "yesno", text: "Андріївський узвіз у Києві відомий художниками та сувенірами.", correct: true, explanation: "Так. Це одна з наймальовничіших вулиць міста." },
    { type: "quiz", text: "Яка річка ділить Київ на правий і лівий берег?", answers: ["Дніпро", "Десна", "Дунай", "Дністер"], correct: 0, explanation: "Дніпро тече через столицю з півночі на південь." },
    { type: "quiz", text: "Хто заснував Києво-Могилянську академію?", answers: ["Петро Могила (XVII ст.)", "Юлій Цезар", "Наполеон", "Колумб"], correct: 0, explanation: "Академія — одна з перших вищих шкіл у Східній Європі." },
    { type: "quiz", text: "Фуникулер у Києві з'єднує…", answers: ["Верхнє місто та Поділ", "Львів і Одесу", "Море і гори", "Два океани"], correct: 0, explanation: "Канатна дорога — популярна атракція з панорамою на Дніпро." },
  ],
  odesa: [
    { type: "quiz", text: "Одеса заснована за указом…", answers: ["Катерини II", "Петра I", "Наполеона", "Юлія Цезаря"], correct: 0, explanation: "1794 року — офіційна дата заснування порту." },
    { type: "imageQuiz", text: "Обери Потьомкінські сходи в Одесі:", answers: [{ image: "https://commons.wikimedia.org/wiki/Special:FilePath/Potemkin_Stairs.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Lviv_Town_Hall.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Saint_Sophia%27s_Cathedral%2C_Kyiv.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Kamianets_Podilskyi_Castle.jpg?width=280" }], correct: 0, explanation: "Сходи з'єднують центр міста з портом — символ Одеси." },
    { type: "yesno", text: "Одеса — найбільший морський порт України.", correct: true, explanation: "Так. Місто — ворота до Чорного моря." },
    { type: "quiz", text: "Яка вулиця в Одесі відома як «одеський Монмартр»?", answers: ["Дерибасівська", "Хрещатик", "Андріївський узвіз", "Святогірська"], correct: 0, explanation: "Дерибасівська — пішохідна, з кафе та пам'ятниками." },
    { type: "quiz", text: "Одеський оперний театр збудований у стилі…", answers: ["Неоренесанс / бароко", "Готика", "Хай-тек", "Японський"], correct: 0, explanation: "Театр — архітектурна перлина XIX століття." },
    { type: "quiz", text: "Яка область має найбільшу площу в Україні?", answers: ["Одеська", "Львівська", "Чернівецька", "Рівненська"], correct: 0, explanation: "Одеська область — найбільша за площею." },
    { type: "yesno", text: "В Одесі кажуть «Привіт, як справи?» з характерним гумором.", correct: true, explanation: "Одеський гумор і діалект — частина культури міста." },
    { type: "quiz", text: "Пам'ятник Дюку де Рішельє стоїть на…", answers: ["Приморському бульварі", "В Карпатах", "У степу", "В лісі"], correct: 0, explanation: "Дюк — перший градоначальник, бронзова статуя біля порту." },
    { type: "quiz", text: "Що таке «одеський привоз»?", answers: ["Ринок і торгове місце", "Гора", "Річка", "Замок"], correct: 0, explanation: "Привоз — колоритний ринок з їжею та жартами." },
    { type: "quiz", text: "Одеса омивається…", answers: ["Чорним морем", "Балтійським", "Тихим", "Північним Льодовитим"], correct: 0, explanation: "Південне узбережжя — на Чорному морі." },
  ],
  "black-sea": [
    { type: "quiz", text: "Чорне море з'єднане з Середземним через…", answers: ["Босфор і Дарданели", "Панамський канал", "Суецький канал лише", "Ледник"], correct: 0, explanation: "Протоки в Туреччині з'єднують моря." },
    { type: "yesno", text: "У Чорному морі водиться оселедець і камбала.", correct: true, explanation: "Так. Це важливі промислові риби." },
    { type: "quiz", text: "Який український курорт на Чорному морі відомий пісками?", answers: ["Затока / Коблево / Скадовськ", "Львів", "Ужгород", "Чернігів"], correct: 0, explanation: "Південь України — популярні пляжі та оздоровлення." },
    { type: "quiz", text: "Чому Чорне море майже не замерзає?", answers: ["М'який клімат і солоність", "Воно над горами", "Там немає води", "Воно під льодом"], correct: 0, explanation: "Зимою температура води рідко опускається до нуля." },
    { type: "quiz", text: "Острів Зміїний у Чорному морі належить…", answers: ["Україні", "Канаді", "Японії", "Бразилії"], correct: 0, explanation: "Острів біля дельти Дунаю — українська територія." },
    { type: "yesno", text: "Дельфіни зустрічаються в українських водах Чорного моря.", correct: true, explanation: "Так. Афаліни інколи плавають біля узбережжя." },
    { type: "quiz", text: "Яка річка впадає в Чорне море з півночі України?", answers: ["Дніпро", "Волга", "Рейн", "Темза"], correct: 0, explanation: "Дніпровсько-Бузький лиман — гирло Дніпра." },
    { type: "quiz", text: "Чорноморський біосферний заповідник — в…", answers: ["Херсонській області", "Львівській", "Волинській", "Чернігівській"], correct: 0, explanation: "Заповідник охороняє унікальну природу дельти." },
    { type: "quiz", text: "Що таке «чорноморська скумбрія» в кулінарії?", answers: ["Риба для копчення", "Десерт", "Суп без риби", "Напій"], correct: 0, explanation: "Копчена скумбрія — класика приморської кухні." },
    { type: "yesno", text: "Кримський півострів омивається Чорним морем.", correct: true, explanation: "Так. Півострів з трьох боків оточений морем." },
  ],
  carpathians: [
    { type: "quiz", text: "Карпати — це…", answers: ["Гори на заході України", "Пустеля", "Озеро", "Полярний льодовик"], correct: 0, explanation: "Карпати тягнуться через кілька країн, у т.ч. Україну." },
    { type: "yesno", text: "Говерла — найвища вершина України.", correct: true, explanation: "Так. 2061 м, у Карпатах на Закарпатті." },
    { type: "quiz", text: "Трембіта традиційно грає в…", answers: ["Гуцульщині", "Сахарі", "Амазонії", "Антарктиді"], correct: 0, explanation: "Довгий дерев'яний ріг — символ Карпат." },
    { type: "quiz", text: "Яке місто — «ворота» до українських Карпат?", answers: ["Ужгород / Івано-Франківськ", "Одеса", "Херсон", "Суми"], correct: 0, explanation: "Закарпаття та Прикарпаття — туристичні регіони." },
    { type: "imageQuiz", text: "Обери Карпатський пейзаж:", answers: [{ image: "https://commons.wikimedia.org/wiki/Special:FilePath/Carpathian_Mountains_Ukraine.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Odessa_Opera_and_Ballet_Theater.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Kyiv_Maidan_Nezhalezhnosti.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Table_grapes_on_white.jpg?width=280" }], correct: 0, explanation: "Карпати — ліси, полонини та вершини." },
    { type: "quiz", text: "Буковель — це…", answers: ["Гірськолижний курорт", "Порт", "Степ", "Пустеля"], correct: 0, explanation: "Буковель у Прикарпатті — популярне місце відпочинку." },
    { type: "yesno", text: "У Карпатах ростуть буки, ялини та смереки.", correct: true, explanation: "Так. Ліси багаті на різні породи дерев." },
    { type: "quiz", text: "Закарпаття славиться…", answers: ["Термальними водами та вином", "Кораловими рифами", "Саванами", "Вулканами"], correct: 0, explanation: "Регіон має унікальну культуру та природу." },
    { type: "quiz", text: "Хата-музей у Криворівні пов'язана з…", answers: ["Фільмом «Тіні забутих предків»", "Космосом", "Океаном", "Пустелею"], correct: 0, explanation: "Карпатські села зберегли традиції та кіно." },
    { type: "quiz", text: "Яка тварина символізує Карпати в фольклорі?", answers: ["Ведмідь / вовк", "Пінгвін", "Кенгуру", "Жираф"], correct: 0, explanation: "У горах живуть ведмеді, вовки, кози." },
  ],
  dnipro: [
    { type: "quiz", text: "Дніпро — найдовша річка, що тече територією…", answers: ["України", "Франції", "Японії", "Канади"], correct: 0, explanation: "Дніпро перетинає країну з півночі на південь." },
    { type: "yesno", text: "Місто Дніпро назване на честь річки.", correct: true, explanation: "Так. Раніше місто називалося Дніпропетровськ." },
    { type: "quiz", text: "Дніпровська ГЕС — одна з перших великих ГЕС. Де вона?", answers: ["Біля Запоріжжя", "У Львові", "В Карпатах", "На морі"], correct: 0, explanation: "Гребля на Дніпрі — символ індустріалізації." },
    { type: "quiz", text: "Острів Хортиця пов'язаний з…", answers: ["Запорізькою Січчю", "Римом", "Єгиптом", "Китаєм"], correct: 0, explanation: "Хортиця — колишня столиця козаків." },
    { type: "quiz", text: "Каскад Дніпра включає…", answers: ["Каховське, Кременчуцьке та інші водосховища", "Тільки море", "Пустелю", "Льодовик"], correct: 0, explanation: "Греблі створили великі водосховища на річці." },
    { type: "imageQuiz", text: "Обери монумент «Захисникам України» в Дніпрі:", answers: [{ image: "https://commons.wikimedia.org/wiki/Special:FilePath/Dnipro_War_Monument.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Lviv_Town_Hall.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Potemkin_Stairs.jpg?width=280" }, { image: "https://commons.wikimedia.org/wiki/Special:FilePath/Odessa_Opera_and_Ballet_Theater.jpg?width=280" }], correct: 0, explanation: "Дніпро — велике промислове та культурне місто." },
    { type: "yesno", text: "Дніпро впадає в Чорне море.", correct: true, explanation: "Так. Гирло — Дніпровсько-Бузький лиман." },
    { type: "quiz", text: "Яка область названа на честь річки?", answers: ["Дніпропетровська (Дніпропетровська)", "Львівська", "Закарпатська", "Волинська"], correct: 0, explanation: "Центр області — місто Дніпро." },
    { type: "quiz", text: "Кам'янська Могила — археологічний пам'ятник біля…", answers: ["Дніпра", "Атлантики", "Альп", "Амазонки"], correct: 0, explanation: "Петрогліфи — наука про давніх людей." },
    { type: "quiz", text: "Дніпровський метрополітен — в місті…", answers: ["Дніпро", "Ужгород", "Трускавець", "Чернівці"], correct: 0, explanation: "Метро — зручний транспорт у великому місті." },
  ],
};

mkdirSync(roundsDir, { recursive: true });

for (const [key, rounds] of Object.entries(EXTRA)) {
  const file = join(roundsDir, `ukraine-${key}-extra.json`);
  writeFileSync(file, JSON.stringify({ rounds }, null, 2) + "\n", "utf8");
  console.log("Wrote", file, rounds.length, "rounds");
}
