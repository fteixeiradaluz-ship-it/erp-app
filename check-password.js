const bcrypt = require('bcryptjs');

const hashPat = '$2b$10$twDpAgBKLT5Ze3tozuzHkOcNEhP5XnYq3S4Fia50BTUx5N5ClDhRK';
const hashFab = '$2b$10$5WzbQ.d8wZU8oSSgWctFp.alRzgSpxtUDUUU0K6XjZ1zy0s7u4Fpq';

const commonPasswords = ['admin123', 'admin', '123456', '12345678', 'mudar123', 'fabricio123', 'patricia123', 'patricia', 'fabricio', 'senha123'];

console.log('Testando senhas comuns...');
for (const pw of commonPasswords) {
  if (bcrypt.compareSync(pw, hashPat)) {
    console.log(`Senha de Patricia encontrada: "${pw}"`);
  }
  if (bcrypt.compareSync(pw, hashFab)) {
    console.log(`Senha de Fabricio encontrada: "${pw}"`);
  }
}
console.log('Fim do teste.');
