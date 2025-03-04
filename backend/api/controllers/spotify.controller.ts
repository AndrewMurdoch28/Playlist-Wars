import { Request, Response } from "express";
import { socketWrapper } from "../../index";
import { generateRandomString } from "@/lib/utils";
import axios from "axios";
import qs from "qs";
import { Track } from "@/database/game.data";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

const controller = {
  login: (req: Request, res: Response) => {
    const scope = "streaming user-read-email user-read-private";
    const state = generateRandomString(16);

    var auth_query_parameters = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: state,
    });

    res.redirect(
      "https://accounts.spotify.com/authorize/?" +
        auth_query_parameters.toString()
    );
  },
  callback: async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        qs.stringify({
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      res.cookie("access_token", response.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600 * 1000,
      });

      res.cookie("refresh_token", response.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 3600 * 1000,
      });

      res.redirect(`${FRONTEND_URL}/game/menu`);
    } catch (error) {
      console.error("Error exchanging code:", error);
      res.status(500).send("Error getting token");
    }
  },
  getToken: (req: Request, res: Response) => {
    const accessToken = req.cookies["access_token"];
    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ access_token: accessToken });
  },
  getPlaylists: async (req: Request, res: Response) => {
    const accessToken = req.cookies["access_token"];
    if (!accessToken) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const playlistURLs: string[] = req.body.playlistURLs;
    if (!Array.isArray(playlistURLs) || playlistURLs.length === 0) {
      res.status(400).json({ success: false, error: "Invalid playlist URLs" });
      return;
    }
    let index = 0;
    try {
      const trackList: Track[] = [];
      const playlistIds = playlistURLs.map(
        (url) => url.split("/").pop()?.split("?")[0]
      );
      for (const playlistId of playlistIds) {
        const { data } = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const tracks = data.items.map((item: any) => ({
          artist: item.track.artists.map((a: any) => a.name).join(", "),
          name: item.track.name,
          releaseYear: item.track.album.release_date.split("-")[0],
          url: item.track.external_urls.spotify,
        }));
        trackList.push(...tracks);
        index++;
      }
      res.json({ success: true, trackList, failedAtIndex: null });
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res
        .status(500)
        .json({ success: false, trackList: [], failedAtIndex: index });
    }
  },
  playSong: async (req: Request, res: Response) => {
    const accessToken = req.cookies["access_token"];
    const url = req.body.url;
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!match) {
      console.error("Invalid Spotify URL");
      res.status(404).send();
      return;
    }
    const trackId = match[1];

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/play?device_id=${accessToken}`,
        {
          uris: [`spotify:track:${trackId}`],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.status(200).send();
    } catch (error) {
      console.error("Error playing track:", error);
      res.status(500).send();
    }
  },
};

export default controller;
