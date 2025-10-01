import { trpc } from "./utils/trpc";

function App() {
  const { data } = trpc.message.getMessage.useQuery();
  return (
    <div className="text-3xl font-bold underline text-red-500">{data}</div>
  );
}

export default App;
