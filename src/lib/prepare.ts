// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         QueryFuncInfo,
         QueryBuilderInfo,
         QueryBuilderInfoInternal } from '../types';
import { parse }                    from './parser';
import { compile }                  from './compiler';
import { fnInfo_cast_to_string,
         fnInfo_cast_to_number,
         fnInfo_cast_to_boolean,
         fnInfo_concat,
         fnInfo_add,
         fnInfo_sub,
         fnInfo_mul,
         fnInfo_div,
         fnInfo_mod,
         fnInfo_count,
         fnInfo_count_distinct,
         fnInfo_sum,
         fnInfo_avg,
         fnInfo_max,
         fnInfo_min,
         fnInfo_calendar_month,
         fnInfo_calendar_quarter,
         fnInfo_calendar_year,
         fnInfo_day_in_month,
         fnInfo_day_in_week,
         fnInfo_day_in_year,
         fnInfo_day_only,
         fnInfo_hour_in_day,
         fnInfo_week_in_month,
         fnInfo_week_in_year,
         fnInfo_calendar_month_lc,
         fnInfo_calendar_quarter_lc,
         fnInfo_calendar_year_lc,
         fnInfo_day_in_month_lc,
         fnInfo_day_in_week_lc,
         fnInfo_day_in_year_lc,
         fnInfo_day_only_lc,
         fnInfo_hour_in_day_lc,
         fnInfo_week_in_month_lc,
         fnInfo_week_in_year_lc }   from './functions';



const builtinFunctions: QueryFuncInfo[] = [
    fnInfo_cast_to_string,
    fnInfo_cast_to_number,
    fnInfo_cast_to_boolean,
    fnInfo_concat,
    fnInfo_add,
    fnInfo_sub,
    fnInfo_mul,
    fnInfo_div,
    fnInfo_mod,
    fnInfo_count,
    fnInfo_count_distinct,
    fnInfo_sum,
    fnInfo_avg,
    fnInfo_max,
    fnInfo_min,
    fnInfo_calendar_month,
    fnInfo_calendar_quarter,
    fnInfo_calendar_year,
    fnInfo_day_in_month,
    fnInfo_day_in_week,
    fnInfo_day_in_year,
    fnInfo_day_only,
    fnInfo_hour_in_day,
    fnInfo_week_in_month,
    fnInfo_week_in_year,
    fnInfo_calendar_month_lc,
    fnInfo_calendar_quarter_lc,
    fnInfo_calendar_year_lc,
    fnInfo_day_in_month_lc,
    fnInfo_day_in_week_lc,
    fnInfo_day_in_year_lc,
    fnInfo_day_only_lc,
    fnInfo_hour_in_day_lc,
    fnInfo_week_in_month_lc,
    fnInfo_week_in_year_lc,
];


const builtinRules: QueryBuilderInfo['rules'] = {
    idFieldName: () => 'Id',
    foreignIdFieldName: (masterResolverName) => masterResolverName ? `${masterResolverName}Id` : void 0,
};


export function prepareBuilderInfo(builder: QueryBuilderInfo): QueryBuilderInfoInternal {
    const ret = {...builder};

    if (! ret.relationships) {
        ret.relationships = {};
    }

    for (const k of Object.keys(ret.resolvers.query)) {
        if (! ret.relationships[k]) {
            ret.relationships[k] = {};
        }
    }

    if (! ret.resolvers.insert) {
        ret.resolvers.insert = {};
    }
    if (! ret.resolvers.update) {
        ret.resolvers.update = {};
    }
    if (! ret.resolvers.remove) {
        ret.resolvers.remove = {};
    }

    if (! ret.functions) {
        ret.functions = [];
    }
    ret.functions = ret.functions.concat(builtinFunctions);

    if (! ret.rules) {
        ret.rules = {};
    }
    ret.rules = {...builtinRules, ...ret.rules};

    if (! ret.events) {
        ret.events = {};
    }

    return ret as QueryBuilderInfoInternal;
}


export function prepareQuery(
        builder: QueryBuilderInfoInternal,
        strings: TemplateStringsArray | string,
        ...values: any[]): PreparedQuery {

    return compile(builder, parse(strings, ...values));
}
