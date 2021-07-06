type ThrustPoint = [number, number];

type Samples = ThrustPoint[];

type ParsedDelays = {
  times: Number[],
  plugged: Boolean
};

export function parseDelays(string) : ParsedDelays;
export function unparseDelays(ParsedDelays) : string;

export declare type Motor = {
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

declare const MOTORS : Array<Motor>;
export default MOTORS;
