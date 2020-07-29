// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryFuncInfo }   from '../types';
import { DatePattern,
         DateTimePattern } from './util';



export const fnInfo_count: QueryFuncInfo = {
    type: 'aggregate',
    name: 'count',
    fn: (ctx, args, records) => {
        if (args.length === 0) {
            return records.length;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                return arg.filter(r => (r === null || r === void 0) ? false : true).length;
            }
            throw new Error(`Argument of function "count" should be field.`);
        }
    },
};


export const fnInfo_count_distinct: QueryFuncInfo = {
    type: 'aggregate',
    name: 'count_distinct',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (r === null || r === void 0) ? false : true)
                    .map(x => JSON.stringify(x));
                return new Set<string>(w).size;
            }
        }
        throw new Error(`Argument of function "count_distinct" should be field.`);
    },
};


export const fnInfo_sum: QueryFuncInfo = {
    type: 'aggregate',
    name: 'sum',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (typeof r === 'number' && !Number.isNaN(r)) ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number) + (b as number));
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "sum" should be field.`);
    },
};


export const fnInfo_avg: QueryFuncInfo = {
    type: 'aggregate',
    name: 'avg',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => (typeof r === 'number' && !Number.isNaN(r)) ? true : false);
                if (w.length) {
                    return (w.reduce((a, b) => (a as number) + (b as number)) as number) / w.length;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "avg" should be field.`);
    },
};


export const fnInfo_max: QueryFuncInfo = {
    type: 'aggregate',
    name: 'max',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => ((typeof r === 'number' && !Number.isNaN(r)) || typeof r === 'string') ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number | string) > (b as number | string) ? a : b);
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "max" should be field.`);
    },
};


export const fnInfo_min: QueryFuncInfo = {
    type: 'aggregate',
    name: 'min',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const arg = args[0];
            if (Array.isArray(arg)) {
                const w = arg
                    .filter(r => ((typeof r === 'number' && !Number.isNaN(r)) || typeof r === 'string') ? true : false);
                if (w.length) {
                    return w.reduce((a, b) => (a as number | string) < (b as number | string) ? a : b);
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "min" should be field.`);
    },
};


export const fnInfo_calendar_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCMonth() + 1;
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCMonth() + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_month" should be field.`);
    },
};


export const fnInfo_calendar_quarter: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_quarter',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return (new Date(arg.value).getUTCMonth() % 4) + 1;
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return (new Date(arg).getUTCMonth() % 4) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_quarter" should be field.`);
    },
};


export const fnInfo_calendar_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_year',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCFullYear();
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCFullYear();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_year" should be field.`);
    },
};


export const fnInfo_day_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCDate();
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCDate();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_month" should be field.`);
    },
};


export const fnInfo_day_in_week: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_week',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCDay() + 1;
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCDay() + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_week" should be field.`);
    },
};


function getUTCDayInYear(d: Date) {
    const d0 = Date.UTC(d.getUTCFullYear(), 0, 1);
    const d1 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return ((d1 - d0) / (1000 * 60 * 60 * 24)) + 1;
}


export const fnInfo_day_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_year',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return getUTCDayInYear(new Date(arg.value));
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return getUTCDayInYear(new Date(arg));
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_year" should be field.`);
    },
};


export const fnInfo_day_only: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_only',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).toISOString().split('T')[0];
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).toISOString().split('T')[0];
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_only" should be field.`);
    },
};


export const fnInfo_hour_in_day: QueryFuncInfo = {
    type: 'scalar',
    name: 'hour_in_day',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return new Date(arg.value).getUTCHours();
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getUTCHours();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "hour_in_day" should be field.`);
    },
};


export const fnInfo_week_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month',
    fn: (ctx, args, record) => {
        if (args.length > 0) {
            return 0;
        }
        throw new Error(`Argument of function "week_in_month" should be field.`);
    },
};


function getUTCWeekInYearISO(d: Date) {
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


export const fnInfo_week_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year',
    fn: (ctx, args, record) => {
        // NOTE: It is different from the definition in salesforce.
        // ISO 8601 week number
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        return getUTCWeekInYearISO(new Date(arg.value));
                    default:
                        return null;
                    }
                }
                break;
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return getUTCWeekInYearISO(new Date(arg));
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "week_in_year" should be field.`);
    },
};
