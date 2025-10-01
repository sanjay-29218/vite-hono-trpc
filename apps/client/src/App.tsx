import { trpc } from "./utils/trpc";

function App() {
  const { data } = trpc.message.getMessages.useQuery({ threadId: "1" });
  return (
    <div className="text-3xl font-bold underline text-red-500">
      {data?.map((message) => message.content)}
    </div>
  );
}

export default App;
