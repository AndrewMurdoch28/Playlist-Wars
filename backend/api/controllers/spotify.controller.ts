import { Request, Response } from "express";
import axios from "axios";
import { Track } from "@/database/game.data";

const controller = {
  getToken: (req: Request, res: Response) => {
    const accessToken = req.get("access_token") as string;
    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ access_token: accessToken });
  },
  getPlaylists: async (req: Request, res: Response) => {
    const accessToken = req.get("access_token") as string;
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
    const accessToken = req.get("access_token") as string;
    const url = req.body.url;
    const deviceId = req.body.deviceId;
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!match) {
      console.error("Invalid Spotify URL");
      res.status(404).send();
      return;
    }
    const trackId = match[1];

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
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
  readAlbumCover: async (req: Request, res: Response) => {
    const accessToken = req.get("access_token") as string;
    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const url = req.body.url;
    if (!url || !url.match(/track\/([a-zA-Z0-9]+)/)) {
      res.status(400).json({ error: "Invalid track URL" });
      return;
    }
    const trackId = url.split("/").pop()?.split("?")[0];
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const albumCoverUrl = response.data.album.images[0].url;
      res.json({ albumCoverUrl });
    } catch (error) {
      console.error("Error fetching album cover:", error);
      res.status(500).json({ error: "Failed to fetch album cover" });
    }
  },
};

export default controller;
