const quadrants = [
    { face : "FRONT", look : "RIGHT" },
    { face : "FRONT", look : "LEFT"  },
    { face : "BACK",  look : "LEFT"  },
    { face : "BACK",  look : "RIGHT" },
];

const qmap = new Map(quadrants.map((q) => [ `${q.face}_${q.look}`, q ]));

export {
    quadrants,
    qmap,
};
