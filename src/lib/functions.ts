// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ScalarQueryFuncInfo,
         QueryFuncInfo }   from '../types';
import { DatePattern,
         DateTimePattern } from './util';
import { getUTCDayInYear,
         getDayInYear }    from './datetime-util';



export const fnInfo_cast_to_string: QueryFuncInfo = {
    type: 'scalar',
    name: 'cast_to_string',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            if (args[0] === null) {
                return null;
            }
            return String(args[0]);
        }
        throw new Error(`Argument of function "cast_to_string" should be field.`);
    },
};

export const fnInfo_cast_to_number: QueryFuncInfo = {
    type: 'scalar',
    name: 'cast_to_number',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            if (args[0] === null) {
                return null;
            }
            return Number(args[0]);
        }
        throw new Error(`Argument of function "cast_to_number" should be field.`);
    },
};

export const fnInfo_cast_to_boolean: QueryFuncInfo = {
    type: 'scalar',
    name: 'cast_to_boolean',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            if (args[0] === null) {
                return null;
            }
            return Boolean(args[0]);
        }
        throw new Error(`Argument of function "cast_to_boolean" should be field.`);
    },
};

export const fnInfo_concat: QueryFuncInfo = {
    type: 'scalar',
    name: 'concat',
    fn: (ctx, args, records) => {
        if (args.length > 0) {
            const z = args.filter(c => c !== null);
            if (z.length === 0) {
                return null;
            }
            return z.map(c => String(c)).join('');
        }
        throw new Error(`Argument of function "concat" should be field.`);
    },
};

export const fnInfo_add: QueryFuncInfo = {
    type: 'scalar',
    name: 'add',
    fn: (ctx, args, records) => {
        if (args.length > 1) {
            const z = args.filter(c => c !== null);
            if (z.length === 0) {
                return null;
            }
            return z.map(c => Number(c)).reduce((a, b) => a + b);
        }
        throw new Error(`Argument of function "add" should be field.`);
    },
};

export const fnInfo_sub: QueryFuncInfo = {
    type: 'scalar',
    name: 'sub',
    fn: (ctx, args, records) => {
        if (args.length > 1) {
            if (args[0] === null) {
                return null;
            }
            return args.filter(c => c !== null).map(c => Number(c)).reduce((a, b) => a - b);
        }
        throw new Error(`Argument of function "sub" should be field.`);
    },
};

export const fnInfo_mul: QueryFuncInfo = {
    type: 'scalar',
    name: 'mul',
    fn: (ctx, args, records) => {
        if (args.length > 1) {
            const z = args.filter(c => c !== null);
            if (z.length === 0) {
                return null;
            }
            return z.map(c => Number(c)).reduce((a, b) => a * b);
        }
        throw new Error(`Argument of function "mul" should be field.`);
    },
};

export const fnInfo_div: QueryFuncInfo = {
    type: 'scalar',
    name: 'div',
    fn: (ctx, args, records) => {
        if (args.length > 1) {
            if (args[0] === null) {
                return null;
            }
            return args.filter(c => c !== null).map(c => Number(c)).reduce((a, b) => a / b);
        }
        throw new Error(`Argument of function "div" should be field.`);
    },
};

export const fnInfo_mod: QueryFuncInfo = {
    type: 'scalar',
    name: 'mod',
    fn: (ctx, args, records) => {
        if (args.length > 1) {
            if (args[0] === null) {
                return null;
            }
            return args.filter(c => c !== null).map(c => Number(c)).reduce((a, b) => a % b);
        }
        throw new Error(`Argument of function "div" should be field.`);
    },
};


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


function dateScalarFunctionGen(fnName: string, fn: (dateStr: string) => any): ScalarQueryFuncInfo['fn'] {
    return (ctx, args, record) => {
        if (args.length > 0) {
            const arg = args[0];
            switch (typeof arg) {
            case 'object':
                if (arg === null) {
                    return null;
                } else {
                    switch (arg.type) {
                    case 'date': case 'datetime':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return fn(arg.value);
                    default:
                        return null;
                    }
                }
            case 'string':
                if (DatePattern.test(arg) || DateTimePattern.test(arg)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return fn(arg);
                } else {
                    return null;
                }
            }
        }
        throw new Error(`Argument of function "${fnName}" should be field.`);
    };
}


export const fnInfo_calendar_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_month',
    fn: dateScalarFunctionGen('calendar_month', (dateStr) => new Date(dateStr).getUTCMonth() + 1),
};


export const fnInfo_calendar_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_month_lc',
    fn: dateScalarFunctionGen('calendar_month_lc', (dateStr) => new Date(dateStr).getMonth() + 1),
};


export const fnInfo_calendar_quarter: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_quarter',
    fn: dateScalarFunctionGen('calendar_quarter', (dateStr) => (new Date(dateStr).getUTCMonth() / 4) + 1),
};


export const fnInfo_calendar_quarter_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_quarter_lc',
    fn: dateScalarFunctionGen('calendar_quarter_lc', (dateStr) => (new Date(dateStr).getMonth() / 4) + 1),
};


export const fnInfo_calendar_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_year',
    fn: dateScalarFunctionGen('calendar_year', (dateStr) => new Date(dateStr).getUTCFullYear()),
};


export const fnInfo_calendar_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'calendar_year_lc',
    fn: dateScalarFunctionGen('calendar_year_lc', (dateStr) => new Date(dateStr).getFullYear()),
};


export const fnInfo_day_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_month',
    fn: dateScalarFunctionGen('day_in_month', (dateStr) => new Date(dateStr).getUTCDate()),
};


export const fnInfo_day_in_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_month_lc',
    fn: dateScalarFunctionGen('day_in_month_lc', (dateStr) => new Date(dateStr).getDate()),
};


export const fnInfo_day_in_week: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_week',
    fn: dateScalarFunctionGen('day_in_week', (dateStr) => new Date(dateStr).getUTCDay() + 1),
};


export const fnInfo_day_in_week_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_week_lc',
    fn: dateScalarFunctionGen('day_in_week_lc', (dateStr) => new Date(dateStr).getDay() + 1),
};


export const fnInfo_day_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_year',
    fn: dateScalarFunctionGen('day_in_year', (dateStr) => getUTCDayInYear(new Date(dateStr))),
};


export const fnInfo_day_in_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_in_year_lc',
    fn: dateScalarFunctionGen('day_in_year_lc', (dateStr) => getDayInYear(new Date(dateStr))),
};


export const fnInfo_day_only: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_only',
    fn: dateScalarFunctionGen('day_only', (dateStr) => new Date(dateStr).toISOString().split('T')[0]),
};


export const fnInfo_day_only_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'day_only_lc',
    fn: dateScalarFunctionGen('day_only_lc', (dateStr) => {
        const d = new Date(dateStr);
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().split('T')[0];
    }),
};


export const fnInfo_hour_in_day: QueryFuncInfo = {
    type: 'scalar',
    name: 'hour_in_day',
    fn: dateScalarFunctionGen('hour_in_day', (dateStr) => new Date(dateStr).getUTCHours()),
};


export const fnInfo_hour_in_day_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'hour_in_day_lc',
    fn: dateScalarFunctionGen('hour_in_day_lc', (dateStr) => new Date(dateStr).getHours()),
};


export const fnInfo_week_in_month: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month',
    fn: dateScalarFunctionGen('week_in_month', (dateStr) => Math.floor(new Date(dateStr).getUTCDate() / 7) + 1),
};


export const fnInfo_week_in_month_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_month_lc',
    fn: dateScalarFunctionGen('week_in_month_lc', (dateStr) => Math.floor(new Date(dateStr).getDate() / 7) + 1),
};


export const fnInfo_week_in_year: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year',
    fn: dateScalarFunctionGen('week_in_year', (dateStr) => Math.floor(getUTCDayInYear(new Date(dateStr)) / 7) + 1),
};


export const fnInfo_week_in_year_lc: QueryFuncInfo = {
    type: 'scalar',
    name: 'week_in_year_lc',
    fn: dateScalarFunctionGen('week_in_year_lc', (dateStr) => Math.floor(getDayInYear(new Date(dateStr)) / 7) + 1),
};
