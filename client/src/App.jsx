import { useState, useEffect } from "react";
import axios from "axios";
import { secp256k1 as secp } from "ethereum-cryptography/secp256k1";
import { keccak256 } from "ethereum-cryptography/keccak";
import { toHex, hexToBytes, utf8ToBytes } from "ethereum-cryptography/utils";

// 和后端保持完全一致的哈希函数
function hashMessage(message) {
  const bytes = utf8ToBytes(JSON.stringify(message));
  return keccak256(bytes);
}

// 签名函数
async function signMessage(msg, privateKeyHex) {
  const privateKey = hexToBytes(privateKeyHex);
  const hash = hashMessage(msg);
  // recovered:true 才会返回 recovery
  const sigObj = await secp.sign(hash, privateKey, { recovered: true });
  return sigObj;
}

function App() {
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // 私钥输入变化，自动算出公钥
  useEffect(() => {
    if (!privateKey) {
      setPublicKey("");
      setBalance(0);
      return;
    }
    try {
      const pkBytes = hexToBytes(privateKey);
      const pub = secp.getPublicKey(pkBytes);
      const pubHex = toHex(pub);
      setPublicKey(pubHex);
      // 查询余额
      axios.get(`http://localhost:3042/balance/${pubHex}`).then((res) => {
        setBalance(res.data.balance);
      });
    } catch (e) {
      console.log("私钥格式错误");
    }
  }, [privateKey]);

  const sendTransaction = async () => {
    if (!privateKey || !recipient || !amount) return;
    try {
      const transaction = {
        to: recipient,
        amount: Number(amount),
      };
      // 签名
      const { sig, recovery } = await signMessage(transaction, privateKey);
      const sigHex = toHex(sig);

      await axios.post("http://localhost:3042/send", {
        transaction,
        signature: sigHex,
        recovery,
        publicKey,
      });
      alert("转账成功！");
      setAmount("");
      // 刷新余额
      const res = await axios.get(`http://localhost:3042/balance/${publicKey}`);
      setBalance(res.data.balance);
    } catch (err) {
      alert("转账失败：" + err.response?.data?.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>ECDSA 转账钱包</h1>
      <div>
        <h3>你的钱包</h3>
        <div>私钥：</div>
        <input
          type="text"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="粘贴你的私钥"
          style={{ width: "600px" }}
        />
        <p>公钥地址：{publicKey}</p>
        <p>余额：{balance}</p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>发起转账</h3>
        <div>接收地址（公钥）：</div>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="粘贴接收方公钥"
          style={{ width: "600px" }}
        />
        <div>金额：</div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <br />
        <button onClick={sendTransaction} style={{ marginTop: "1rem" }}>
          提交转账（签名）
        </button>
      </div>
    </div>
  );
}

export default App;
