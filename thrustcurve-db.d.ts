type ThrustPoint = [number, number];

type Samples = ThrustPoint[];

type ParsedDelays = {
  times: Number[],
  plugged: Boolean
};

export function parseDelays(string) : ParsedDelays;
export function unparseDelays(ParsedDelays) : string;

export declare type Motor = {
    avgThrustN :  number;
    burnTimeS :  number;
    certOrg :  string;
    commonName :  string;
    dataFiles :  number;
    delays :  string;
    designation :  string;
    diameter :  number;
    discontinued ?:  boolean;
    impulseClass :  string;
    infoUrl :  string;
    length :  number;
    manufacturer :  string;
    manufacturerAbbrev :  string;
    maxThrustN :  number;
    motorId :  string;
    propInfo :  string;
    propWeightG :  number;
    samples ?:  Samples;
    sparky ?:  boolean;
    totImpulseNs :  number;
    totalWeightG :  number;
    type :  string;
    updatedOn :  string;
}

declare const MOTORS : Array<Motor>;
export default MOTORS;
