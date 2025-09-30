import "./App.css";
import { trpc } from "./utils/trpc";

function App() {
  const { data } = trpc.message.getMessage.useQuery();
  console.log(data);
  return <>{data}</>;
}

export default App;
