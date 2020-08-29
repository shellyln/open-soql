// Copyright (c) 2020 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { PreparedQuery,
         PreparedOrderByField }      from './types';
import { getTrueCasePathName,
         getObjectTrueCasePathValue,
         getObjectPathValue }        from './lib/util';



// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function sortRecords(query: PreparedQuery, records: any[]) {
    if (query.orderBy && records.length) {
        const primaryPathLen = query.from[0].name.length;
        const orderFields = query.orderBy;

        const direction =
            (f: PreparedOrderByField, r: number) =>
                f.direction === 'desc' ? -r : r;

        const fieldAndFNames = orderFields.map(f => ({
            f,
            fName: getTrueCasePathName(records[0], f.name.slice(primaryPathLen)),
        }));

        records = records.sort((a, b) => {

            LOOP: for (let i = 0; i < fieldAndFNames.length; i++) {
                // eslint-disable-next-line prefer-const
                let {f, fName} = fieldAndFNames[i];

                let va = null;
                let vb = null;

                if (fName !== null) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    va = getObjectTrueCasePathValue(a, fName);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    vb = getObjectTrueCasePathValue(b, fName);
                } else {
                    // Fallback (when the child relationship of records[0] is null)

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    va = getObjectPathValue(a, f.name.slice(primaryPathLen));

                    fieldAndFNames[i].fName = fName = getTrueCasePathName(b, f.name.slice(primaryPathLen));

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    vb = fName !== null ? getObjectTrueCasePathValue(b, fName) : null;
                }

                if (va === vb) {
                    continue;
                }
                if (va === null) {
                    return direction(f, f.nulls === 'last' ? 1 : -1); // default is `nulls first`
                }
                if (vb === null) {
                    return direction(f, f.nulls === 'last' ? -1 : 1); // default is `nulls first`
                }

                switch (typeof va) {
                case 'number': case 'bigint':
                    return direction(f, (va as any) - (vb as any));
                case 'string':
                    // TODO: date and datetime
                    return direction(f, va > vb ? 1 : -1);
                default:
                    // Ignore this field
                    continue LOOP;
                }
            }
            return 0;
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return records;
}
