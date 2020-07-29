// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getUTCDayInYear(d: Date) {
    const d0 = Date.UTC(d.getUTCFullYear(), 0, 1);
    const d1 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return ((d1 - d0) / (1000 * 60 * 60 * 24)) + 1;
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getDayInYear(d: Date) {
    const d0 = Date.UTC(d.getFullYear(), 0, 1);
    const d1 = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return ((d1 - d0) / (1000 * 60 * 60 * 24)) + 1;
}


/*
export function getUTCWeekInYearISO(d: Date) {
    // ISO 8601 week number
    // Weeks starting on Monday.
    // The first week of year (W1) contains first Thursday.
    const dcMon = d.getUTCMonth();
    const dcDate = d.getUTCDate();

    if (dcMon === 11 && dcDate >= 29) {
        const d2 = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1));
        const day2 = (d2.getUTCDay() + 6) % 7; // Monday is 0
        if (day2 <= 3) {
            // Mon, Tue, Wed, Thu
            //  29   30   31   01  (day2 === 3)
            //  30   31   01       (day2 === 2)
            //  31   01            (day2 === 1)
            //  01                 (day2 === 0)
            // Next year's first week is W01.
            if (day2 + dcDate >= 32) {
                return 1;
            }
        }
    }

    const d0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const day0 = (d0.getUTCDay() + 6) % 7; // Monday is 0

    const ds = d0.getTime() - ((1000 * 60 * 60 * 24) * day0);

    const dc = Date.UTC(d.getUTCFullYear(), dcMon, dcDate);
    const diff = Math.floor((dc - ds) / (1000 * 60 * 60 * 24 * 7));

    if (day0 > 3) {
        // First day of year is: Fri, Sat, Sun
        // First day of year is last year's final week.
        if (diff === 0) {
            // Last year's final week.
            const d1 = new Date(Date.UTC(d.getUTCFullYear() - 1, 0, 1));
            const day1 = (d1.getUTCDay() + 6) % 7; // Monday is 0

            const dp = d1.getTime() - ((1000 * 60 * 60 * 24) * day1);
            const diff1 = Math.floor((dc - dp) / (1000 * 60 * 60 * 24 * 7));
            if (day1 > 3) {
                // Fri, Sat, Sun
                return diff1;
            } else {
                // Mon, Tue, Wed, Thu
                return diff1 + 1;
            }
        } else {
            return diff;
        }
    } else {
        // First day of year is: Mon, Tue, Wed, Thu
        // First day of year is this year's first week.
        return diff + 1;
    }
}
*/
