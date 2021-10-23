type ThrustPoint = [number, number];

export declare type Motor = {
    availability :  'regular' | 'OOP';
    avgThrustN :  number;
    burnTimeS :  number;
    certOrg :  string;
    commonName :  string;
    dataFiles :  number;
    delays :  string;
    designation :  string;
    diameter :  number;
    impulseClass :  string;
    infoUrl :  string;
    length :  number;
    manufacturer :  string;
    manufacturerAbbrev :  string;
    maxThrustN :  number;
    motorId :  string;
    propInfo :  string;
    propWeightG :  number;
    samples ?:  ThrustPoint[];
    sparky ?:  boolean;
    totImpulseNs :  number;
    totalWeightG :  number;
    type :  string;
    updatedOn :  string;
}

declare const MOTORS : Array<Motor>;
export default MOTORS;
