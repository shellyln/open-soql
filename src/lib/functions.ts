// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { QueryFuncInfo }   from '../types';
import { DatePattern,
         DateTimePattern } from './util';
import { getUTCDayInYear,
         getDayInYear }    from './datetime-util';



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


export const fnInfo_calendar_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_month_lc',
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
                        return new Date(arg.value).getMonth() + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getMonth() + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_month_lc" should be field.`);
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
                        return (new Date(arg.value).getUTCMonth() / 4) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return (new Date(arg).getUTCMonth() / 4) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_quarter" should be field.`);
    },
};


export const fnInfo_calendar_quarter_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_quarter_lc',
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
                        return (new Date(arg.value).getMonth() / 4) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return (new Date(arg).getMonth() / 4) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_quarter_lc" should be field.`);
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


export const fnInfo_calendar_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_year_lc',
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
                        return new Date(arg.value).getFullYear();
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getFullYear();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "calendar_year_lc" should be field.`);
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


export const fnInfo_day_in_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_month_lc',
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
                        return new Date(arg.value).getDate();
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getDate();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_month_lc" should be field.`);
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


export const fnInfo_day_in_week_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_week_lc',
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
                        return new Date(arg.value).getDay() + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getDay() + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_week_lc" should be field.`);
    },
};


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


export const fnInfo_day_in_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_year_lc',
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
                        return getDayInYear(new Date(arg.value));
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return getDayInYear(new Date(arg));
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_in_year_lc" should be field.`);
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


export const fnInfo_day_only_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_only_lc',
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
                        {
                            const d = new Date(arg.value);
                            return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().split('T')[0];
                        }
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    {
                        const d = new Date(arg);
                        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().split('T')[0];
                    }
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "day_only_lc" should be field.`);
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


export const fnInfo_hour_in_day_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'hour_in_day_lc',
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
                        return new Date(arg.value).getHours();
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return new Date(arg).getHours();
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "hour_in_day_lc" should be field.`);
    },
};


export const fnInfo_week_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month',
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
                        return Math.floor(new Date(arg.value).getUTCDate() / 7) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return Math.floor(new Date(arg).getUTCDate() / 7) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "week_in_month" should be field.`);
    },
};


export const fnInfo_week_in_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month_lc',
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
                        return Math.floor(new Date(arg.value).getDate() / 7) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return Math.floor(new Date(arg).getDate() / 7) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "week_in_month_lc" should be field.`);
    },
};


export const fnInfo_week_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year',
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
                        return Math.floor(getUTCDayInYear(new Date(arg.value)) / 7) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return Math.floor(getUTCDayInYear(new Date(arg)) / 7) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "week_in_year" should be field.`);
    },
};


export const fnInfo_week_in_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year_lc',
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
                        return Math.floor(getDayInYear(new Date(arg.value)) / 7) + 1;
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    return Math.floor(getDayInYear(new Date(arg)) / 7) + 1;
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "week_in_year_lc" should be field.`);
    },
};
