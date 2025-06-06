/*! detectEurope.js v0.1.2
    Determine whether a user is from the European Union (EU) area
    https://github.com/faisalman/detect-europe-js
    Author: Faisal Salman <f@faisalman.com>
    MIT License */
const TIMEZONE = {
    ANDORRA: {
        ANDORRA: 'Europe/Andorra'
    },
    AUSTRIA: {
        VIENNA: 'Europe/Vienna'
    },
    BELGIUM: {
        BRUSSELS: 'Europe/Brussels'
    },
    BULGARIA: {
        SOFIA: 'Europe/Sofia'
    },
    CROATIA: {
        ZAGREB: 'Europe/Zagreb'
    },
    CYPRUS: {
        NICOSIA_EUROPE: 'Europe/Nicosia',
        NICOSIA_ASIA: 'Asia/Nicosia',
        FAMAGUSTA: 'Asia/Famagusta'
    },
    CZECHIA: {
        PRAGUE: 'Europe/Prague'
    },
    DENMARK: {
        COPENHAGEN: 'Europe/Copenhagen',
        FAROE: 'Atlantic/Faroe'
    },
    ESTONIA: {
        TALLINN: 'Europe/Tallinn'
    },
    FINLAND: {
        HELSINKI: 'Europe/Helsinki',
        MARIEHAMN: 'Europe/Mariehamn'
    },
    FRANCE: {
        PARIS: 'Europe/Paris',
        CAYENNE: 'America/Cayenne',
        GUADELOUPE: 'America/Guadeloupe',
        MARIGOT: 'America/Marigot',
        MARTINIQUE: 'America/Martinique',
        MAYOTTE: 'Indian/Mayotte',
        REUNION: 'Indian/Reunion'
    },
    GERMANY: {
        BERLIN: 'Europe/Berlin',
        BUSINGEN: 'Europe/Busingen'
    },
    GREECE: {
        ATHENS: 'Europe/Athens'
    },
    HUNGARY: {
        BUDAPEST: 'Europe/Budapest'
    },
    ICELAND: {
        REYKJAVIK: 'Atlantic/Reykjavik'
    },
    IRELAND: {
        DUBLIN: 'Europe/Dublin'
    },
    ITALY: {
        ROME: 'Europe/Rome'
    },
    LATVIA: {
        RIGA: 'Europe/Riga'
    },
    LIECHTENSTEIN: {
        VADUZ: 'Europe/Vaduz'
    },
    LITHUANIA: {
        VILNIUS: 'Europe/Vilnius'
    },
    LUXEMBOURG: {
        LUXEMBOURG: 'Europe/Luxembourg'
    },
    MALTA: {
        MALTA: 'Europe/Malta'
    },
    MONACO: {
        MONACO: 'Europe/Monaco'
    },
    NETHERLANDS: {
        AMSTERDAM: 'Europe/Amsterdam',
        ARUBA: 'America/Aruba',
        CURACAO: 'America/Curacao',
        KRALENDIJK: 'America/Kralendijk',
        LOWER_PRINCES: 'America/Lower_Princes'
    },
    NORWAY: {
        OSLO: 'Europe/Oslo',
        JAN_MAYEN: 'Atlantic/Jan_Mayen',
        LONGYEARBYEN: 'Arctic/Longyearbyen'
    },
    POLAND: {
        WARSAW: 'Europe/Warsaw'
    },
    PORTUGAL: {
        LISBON: 'Europe/Lisbon',
        AZORES: 'Atlantic/Azores',
        MADEIRA: 'Atlantic/Madeira'
    },
    ROMANIA: {
        BUCHAREST: 'Europe/Bucharest'
    },
    SAN_MARINO: {
        SAN_MARINO: 'Europe/San_Marino'
    },
    SLOVAKIA: {
        BRATISLAVA: 'Europe/Bratislava'
    },
    SLOVENIA: {
        LJUBLJANA: 'Europe/Ljubljana'
    },
    SPAIN: {
        MADRID: 'Europe/Madrid',
        CANARY: 'Atlantic/Canary',
        CEUTA: 'Africa/Ceuta'
    },
    SWEDEN: {
        STOCKHOLM: 'Europe/Stockholm'
    },
    SWITZERLAND: {
        ZURICH: 'Europe/Zurich'
    },
    VATICAN: {
        VATICAN: 'Europe/Vatican'
    }
};
const EU_TIMEZONE = [
    TIMEZONE.AUSTRIA.VIENNA,
    TIMEZONE.BELGIUM.BRUSSELS,
    TIMEZONE.BULGARIA.SOFIA,
    TIMEZONE.CROATIA.ZAGREB,
    TIMEZONE.CYPRUS.NICOSIA_EUROPE,
    TIMEZONE.CYPRUS.NICOSIA_ASIA,
    TIMEZONE.CYPRUS.FAMAGUSTA,
    TIMEZONE.CZECHIA.PRAGUE,
    TIMEZONE.DENMARK.COPENHAGEN,
    TIMEZONE.ESTONIA.TALLINN,
    TIMEZONE.FINLAND.HELSINKI,
    TIMEZONE.FINLAND.MARIEHAMN,
    TIMEZONE.FRANCE.PARIS,
    TIMEZONE.GERMANY.BERLIN,
    TIMEZONE.GREECE.ATHENS,
    TIMEZONE.HUNGARY.BUDAPEST,
    TIMEZONE.IRELAND.DUBLIN,
    TIMEZONE.ITALY.ROME,
    TIMEZONE.LATVIA.RIGA,
    TIMEZONE.LITHUANIA.VILNIUS,
    TIMEZONE.LUXEMBOURG.LUXEMBOURG,
    TIMEZONE.MALTA.MALTA,
    TIMEZONE.NETHERLANDS.AMSTERDAM,
    TIMEZONE.POLAND.WARSAW,
    TIMEZONE.PORTUGAL.LISBON,
    TIMEZONE.ROMANIA.BUCHAREST,
    TIMEZONE.SLOVAKIA.BRATISLAVA,
    TIMEZONE.SLOVENIA.LJUBLJANA,
    TIMEZONE.SPAIN.MADRID,
    TIMEZONE.SWEDEN.STOCKHOLM,
    TIMEZONE.FRANCE.CAYENNE,
    TIMEZONE.FRANCE.GUADELOUPE,
    TIMEZONE.FRANCE.MARIGOT,
    TIMEZONE.FRANCE.MARTINIQUE,
    TIMEZONE.FRANCE.MAYOTTE,
    TIMEZONE.FRANCE.REUNION,
    TIMEZONE.PORTUGAL.AZORES,
    TIMEZONE.PORTUGAL.MADEIRA,
    TIMEZONE.SPAIN.CANARY
];
const EEA_EFTA_TIMEZONE = [
    TIMEZONE.ICELAND.REYKJAVIK,
    TIMEZONE.LIECHTENSTEIN.VADUZ,
    TIMEZONE.NORWAY.OSLO,
    TIMEZONE.NORWAY.JAN_MAYEN
];
const EEA_TIMEZONE = [
    ...EU_TIMEZONE,
    ...EEA_EFTA_TIMEZONE
];
const EFTA_TIMEZONE = [
    TIMEZONE.SWITZERLAND.ZURICH,
    ...EEA_EFTA_TIMEZONE
];
const SCHENGEN_TIMEZONE = [
    TIMEZONE.AUSTRIA.VIENNA,
    TIMEZONE.BELGIUM.BRUSSELS,
    TIMEZONE.BULGARIA.SOFIA,
    TIMEZONE.CROATIA.ZAGREB,
    TIMEZONE.CZECHIA.PRAGUE,
    TIMEZONE.DENMARK.COPENHAGEN,
    TIMEZONE.ESTONIA.TALLINN,
    TIMEZONE.FINLAND.HELSINKI,
    TIMEZONE.FINLAND.MARIEHAMN,
    TIMEZONE.FRANCE.PARIS,
    TIMEZONE.GERMANY.BERLIN,
    TIMEZONE.GREECE.ATHENS,
    TIMEZONE.HUNGARY.BUDAPEST,
    TIMEZONE.ITALY.ROME,
    TIMEZONE.LATVIA.RIGA,
    TIMEZONE.LITHUANIA.VILNIUS,
    TIMEZONE.LUXEMBOURG.LUXEMBOURG,
    TIMEZONE.MALTA.MALTA,
    TIMEZONE.NETHERLANDS.AMSTERDAM,
    TIMEZONE.POLAND.WARSAW,
    TIMEZONE.PORTUGAL.LISBON,
    TIMEZONE.PORTUGAL.AZORES,
    TIMEZONE.PORTUGAL.MADEIRA,
    TIMEZONE.ROMANIA.BUCHAREST,
    TIMEZONE.SLOVAKIA.BRATISLAVA,
    TIMEZONE.SLOVENIA.LJUBLJANA,
    TIMEZONE.SPAIN.MADRID,
    TIMEZONE.SPAIN.CANARY,
    TIMEZONE.SWEDEN.STOCKHOLM,
    TIMEZONE.ANDORRA.ANDORRA,
    TIMEZONE.GERMANY.BUSINGEN,
    TIMEZONE.ICELAND.REYKJAVIK,
    TIMEZONE.LIECHTENSTEIN.VADUZ,
    TIMEZONE.MONACO.MONACO,
    TIMEZONE.NORWAY.OSLO,
    TIMEZONE.SAN_MARINO.SAN_MARINO,
    TIMEZONE.SPAIN.CEUTA,
    TIMEZONE.SWITZERLAND.ZURICH,
    TIMEZONE.VATICAN.VATICAN
];
const isTimezoneIn = (tz) => { var _a; return typeof window !== 'undefined' && ((_a = window === null || window === void 0 ? void 0 : window.Intl) === null || _a === void 0 ? void 0 : _a.DateTimeFormat) && tz.includes(Intl.DateTimeFormat().resolvedOptions().timeZone); };
const isFromEU = () => isTimezoneIn(EU_TIMEZONE);
const isFromEEA = () => isTimezoneIn(EEA_TIMEZONE);
const isFromEFTA = () => isTimezoneIn(EFTA_TIMEZONE);
const isFromSchengen = () => isTimezoneIn(SCHENGEN_TIMEZONE);
export { isFromEU, isFromEEA, isFromEFTA, isFromSchengen };
