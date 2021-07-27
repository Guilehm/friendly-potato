package crawlers

import (
	"compress/gzip"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"goapi/db"
	"goapi/models"
	"io/ioutil"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo/options"
)

// START CRAWLER
// crawler := UNCrawler{
// 	Name:        "un",
// 	BaseUrl:     "https://digitallibrary.un.org",
// 	SiteMapPath: "/sitemap_index.xml.gz",
// }

// err := crawler.GetAllUrlsFromSitemaps()
// if err != nil {
// 	fmt.Println("Error while trying to get sitemap", err)
// }

type UNCrawler struct {
	Name        string
	BaseUrl     string
	SiteMapPath string
}

func (c UNCrawler) GetResponse(url string) (*http.Response, error) {
	fmt.Println("Requesting", url)
	resp, err := http.Get(url)
	if err != nil {
		return resp, err
	}

	if resp.StatusCode != http.StatusOK {
		return resp, errors.New("HTTP error: " + resp.Status)
	}

	return resp, nil
}

func (c UNCrawler) GetAllUrlsFromSitemaps() error {

	url := c.BaseUrl + c.SiteMapPath

	resp, err := c.GetResponse(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	gReader, err := gzip.NewReader(resp.Body)
	if err != nil {
		return err
	}

	unzipData, err := ioutil.ReadAll(gReader)
	if err != nil {
		return err
	}

	var sitemap models.SitemapIndex
	xml.Unmarshal(unzipData, &sitemap)

	var unUrlsCollection = db.OpenCollection("urls", "un")

	for _, sitemap := range sitemap.Sitemaps {
		fmt.Println("Requesting", sitemap.Location)
		resp, err := c.GetResponse(sitemap.Location)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		gReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return err
		}

		var sitemapDetail models.SitemapDetail

		unzipData, err := ioutil.ReadAll(gReader)
		if err != nil {
			return err
		}
		xml.Unmarshal(unzipData, &sitemapDetail)
		sitemapCount := len(sitemapDetail.Sitemaps)
		docs := make([]interface{}, sitemapCount)
		for i, v := range sitemapDetail.Sitemaps {
			docs[i] = v
		}

		opts := options.InsertMany().SetOrdered(false)
		_, err = unUrlsCollection.InsertMany(
			context.TODO(), docs, opts,
		)
		if err != nil {
			return err
		}
		fmt.Printf("Success saving %v\n", sitemapCount)
	}

	return nil
}
