interface ThrustPoint : [number, number];

interface Samples : ThrustPoint[];

interface Motor : {
    motorId :  string;
    manufacturer :  string;
    manufacturerAbbrev :  string;
    designation :  string;
    commonName :  string;
    impulseClass :  string;
    diameter :  number;
    length :  number;
    type :  string;
    certOrg :  string;
    avgThrustN :  number;
    maxThrustN :  number;
    totImpulseNs :  number;
    burnTimeS :  number;
    dataFiles :  number;
    infoUrl :  string;
    totalWeightG :  number;
    propWeightG :  number;
    delays :  string;
    propInfo :  string;
    sparky ?:  boolean;
    updatedOn :  string;
    samples ?:  Samples;
}

export declare type Motor[];
