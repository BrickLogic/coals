//
// // pipe(
// //     map(),
// //     takeUntil(),
// //     combineLatest()
// // )(obs)
//
// import {Observable, Subscriber} from "./coals";
//
// export interface UnaryFunction<T, R> { (source: T): R; }
//
// // eslint-disable-next-line @typescript-eslint/no-empty-interface
// export interface OperatorFunction<T, R> extends UnaryFunction<Observable<T>, Observable<R>> {}
//
// export function lift<T>(source: Observable<T>): Observable<T> {
//     const o = new Observable();
//     o.source = source;
//     return o;
// }
//
// export const applyOperator = <T, R>(source: Observable<T>, operator: OperatorFunction<T, R>) => {
//     const s = lift(source);
//
//
// }
//
// export const pipe = <T, R>(...operators: OperatorFunction<T, R>[], source: Observable<T>) => {
//     return operators.reduce((source, operator) => {
//
//     }, source)
// };
