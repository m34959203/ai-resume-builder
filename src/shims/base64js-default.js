// Делает совместимость с импортами вида `import base64 from 'base64-js'`
import * as real from 'base64-js-real';

// Собираем default-объект с нужными методами
const base64 = {
  toByteArray: real.toByteArray,
  fromByteArray: real.fromByteArray,
};

export default base64;
export const toByteArray = real.toByteArray;
export const fromByteArray = real.fromByteArray;
