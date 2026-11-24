const express = require("express");
const cors = require("cors");
const secp = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const {
  hexToBytes,
  utf8ToBytes,
  toHex,
} = require("ethereum-cryptography/utils");

const app = express();
const port = 3042;

app.use(cors());
app.use(express.json());

// ========== 这里填你自己生成的3个公钥！！==========
const balances = {
  "03864d266d998432c0da3f4f71e96cc9e79c5fb88aca5863d71698767f73bba8e6": 100,
  "02baa2f2512c6f434311f125cb8d53e9296eee2b19af61e2d561b39ed81824b28c": 50,
  "03fa8fd2fcfe44117b2b0297a44a8ae2e46b5d80b02b4c240cd583cd9fcf2f9a5e": 75,
};
// =============================================

// 和前端一模一样哈希函数！一字不动
function hashMessage(message) {
  const bytes = utf8ToBytes(JSON.stringify(message));
  return keccak256(bytes);
}

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", async (req, res) => {
  try {
    const { transaction, signature, recovery, publicKey } = req.body;
    const { to, amount } = transaction;

    // 1. 哈希交易
    const hash = hashMessage(transaction);
    const sigBytes = hexToBytes(signature);

    // 2. 恢复公钥
    const recoveredPub = secp.recoverPublicKey(hash, sigBytes, recovery);
    const recoveredPubHex = toHex(recoveredPub);

    // 3. 校验签名
    if (recoveredPubHex !== publicKey) {
      return res.status(400).send({ message: "签名校验失败，不是本人签名！" });
    }

    // 4. 余额校验
    if (!balances[publicKey] || balances[publicKey] < amount) {
      return res.status(400).send({ message: "余额不足" });
    }

    // 5. 执行转账
    balances[publicKey] -= amount;
    balances[to] += amount;

    res.send({ message: "转账成功", balances });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "服务器错误" });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}!`);
});
