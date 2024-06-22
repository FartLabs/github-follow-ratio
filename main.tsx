import { MINUTE } from "@std/datetime";
import { createRouter } from "@fartlabs/rt";
import {
  A,
  BODY,
  BUTTON,
  DIV,
  FORM,
  H1,
  HEAD,
  HTML,
  INPUT,
  LINK,
  P,
  SCRIPT,
  TITLE,
} from "@fartlabs/htx";
import type { FollowRatio } from "./github.ts";
import { getFollowRatio } from "./github.ts";

const kv = await Deno.openKv();

async function getAndCacheFollowRatio(username: string): Promise<FollowRatio> {
  const followRatioKey: Deno.KvKey = ["followRatio", username];
  const followRatioResult = await kv.get<FollowRatio>(followRatioKey);
  if (followRatioResult?.value) {
    return followRatioResult.value;
  }

  const followRatio = await getFollowRatio(username);
  await kv.set(
    followRatioKey,
    followRatio,
    { expireIn: 5 * MINUTE },
  );
  return followRatio;
}

function Layout({ children }: { children?: string }) {
  return "<!DOCTYPE html>" + (
    <HTML>
      <HEAD>
        <TITLE>Follow Ratio</TITLE>

        <LINK
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/EthanThatOneKid/thelcars/assets/lcars-ultra-classic.css"
        />
        <LINK
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/EthanThatOneKid/thelcars/assets/lcars-colors.css"
        />
        <SCRIPT
          src="https://cdn.jsdelivr.net/gh/EthanThatOneKid/thelcars/assets/lcars.js"
          defer
        >
        </SCRIPT>
        <SCRIPT src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js">
        </SCRIPT>
      </HEAD>
      <BODY>
        {children}
      </BODY>
    </HTML>
  );
}

function UsernameInputView({ username }: { username?: string }) {
  return (
    <DIV>
      <H1>Follow Ratio</H1>
      <P>Enter a username to get their follow ratio</P>
      <FORM action="" method="GET">
        <INPUT
          type="search"
          name="username"
          placeholder="Username"
          value={username}
        />
        <BUTTON type="submit">Get Follow Ratio</BUTTON>
      </FORM>
    </DIV>
  );
}

function FollowRatioView(props: {
  username: string;
  followRatio: FollowRatio;
}) {
  return (
    <DIV>
      <UsernameInputView username={props.username} />
      <P>Followers: {props.followRatio.followers}</P>
      <P>Following: {props.followRatio.following}</P>
      <P>Ratio: {props.followRatio.ratio}</P>
      <P>Difference: {props.followRatio.difference}</P>
      <P>
        Not following back ({props.followRatio.notFollowingBack?.length}):{" "}
        {props.followRatio.notFollowingBack?.map((username) => (
          <GitHubProfileLink username={username} />
        )).join(", ")}
      </P>
      <P>
        Not followed back ({props.followRatio.notFollowedBack?.length}):{" "}
        {props.followRatio.notFollowedBack?.map((username) => (
          <GitHubProfileLink username={username} />
        )).join(", ")}
      </P>
      <P>
        Following each other ({props.followRatio.followingEachOther?.length}):
        {" "}
        {props.followRatio.followingEachOther?.map((username) => (
          <GitHubProfileLink username={username} />
        )).join(", ")}
      </P>
    </DIV>
  );
}

function GitHubProfileLink({ username }: { username: string }) {
  return <A href={`https://github.com/${username}`}>@{username}</A>;
}

const router = createRouter()
  .get("/", async (event) => {
    const username = event.url.searchParams.get("username");
    return new Response(
      <Layout>
        {username
          ? (
            <FollowRatioView
              username={username}
              followRatio={await getAndCacheFollowRatio(username)}
            />
          )
          : <UsernameInputView />}
      </Layout>,
      { headers: { "Content-Type": "text/html" } },
    );
  });

Deno.serve((request) => router.fetch(request));