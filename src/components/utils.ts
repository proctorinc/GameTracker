export const limitSigFigs = (num: number, sigFigs: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumSignificantDigits: sigFigs
    }).format(num);
};