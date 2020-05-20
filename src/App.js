import React from "react";
import {metaTransfer, metaApprove, metaTransferFrom, allowance} from "./web3Service"
function App() {
  return (
    <div>
      <h3> MetaToken </h3>
        <React.Fragment>
          {""}
          <button onClick={() => metaTransfer()} size="small">
            Transfer
          </button>
          <button onClick={() => metaApprove()} size="small">
            Approve
          </button>
          <button onClick={() => metaTransferFrom()} size="small">
            Transfer From
          </button>
          <button onClick={() => allowance()} size="small">
            Allowance
          </button>
        </React.Fragment>
    </div>
  );
}

export default App;