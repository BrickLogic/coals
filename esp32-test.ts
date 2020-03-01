import {merge, of} from "./coals";

const a = of(1);
const b = of("123");

const m = merge(a, b);

m.subscribe((e) => {
    console.log(e);
});

a.next(22);
b.next("asdasd");
