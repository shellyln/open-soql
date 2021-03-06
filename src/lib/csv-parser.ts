// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parserInput }        from 'fruitsconfits/modules/lib/types';
import { formatErrorMessage } from 'fruitsconfits/modules/lib/parser';
import { getStringParsers }   from 'fruitsconfits/modules/lib/string-parser';



type Ctx = undefined;
type Ast = string | number | boolean | null | string[];


const $s = getStringParsers<Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        [tokens.reduce((a, b) => a as string + b as string)] : []),
});

const {seq, cls, notCls, classes, numbers, cat,
       repeat, end, first, combine, erase, trans, ahead,
       makeProgram} = $s;


const decimalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 10)])(
        numbers.int);

const floatingPointNumberValue =
    trans(tokens => [Number.parseFloat((tokens as string[])[0].replace(/_/g, ''))])(
        numbers.float);

const numberValue =
    first(floatingPointNumberValue,
          decimalIntegerValue, );

const trueValue =
    trans(tokens => [true])(seq('true'));

const falseValue =
    trans(tokens => [false])(seq('false'));


const quoted = trans(input => input.length ? input : [''])(
    erase(repeat(classes.spaceWithinSingleLine), cls('"')),
    cat(repeat(first(
        trans(input => ['"'])(seq('""')),
        notCls('"'), ))),
    erase(cls('"'), repeat(erase(classes.spaceWithinSingleLine))), );

const nakidNum = trans(input => input.length ? input : [null])(
    erase(repeat(classes.spaceWithinSingleLine)),
    first(trueValue, falseValue, numberValue),
    erase(repeat(classes.spaceWithinSingleLine)),
    ahead(first(cls(',', '\r\n', '\n', '\r'), end())), );

const nakid = trans(input => input.length ? ([input[0] ? (input[0] as string).trim() : '']) : [null])(
    erase(repeat(classes.spaceWithinSingleLine)),
    cat(repeat(first(
        erase(classes.spaceWithinSingleLine, ahead(cls(',', '\r\n', '\n', '\r'))),
        notCls(',', '\r\n', '\n', '\r'), ))));

const cell = first(quoted, nakidNum, nakid);

const row = trans(input => [input as string[]])(
    cell,
    repeat(combine(erase(seq(',')), cell)), );

const rows = makeProgram(combine(
    row,
    repeat(combine(erase(classes.newline), row)),
    end(), ));


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function parse(s: string) {
    const z = rows(parserInput(s));
    if (! z.succeeded) {
        throw new Error(formatErrorMessage(z));
    }
    return z.tokens as string[][];
}
