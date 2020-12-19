import React, {Component} from 'react';
import axios from 'axios';
import {WORLD_MAP_URL, SATELLITE_POSITION_URL, SAT_API_KEY} from '../constants';
import {feature} from 'topojson-client';
import { geoKavrayskiy7 } from 'd3-geo-projection';
import { geoGraticule, geoPath } from 'd3-geo';
import { select as d3Select } from 'd3-selection';

import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";

import {timeFormat as d3TimeFormat} from 'd3-time-format'

const width = 960;
const height = 600;

class WorldMap extends Component {
    constructor() {
        super();
        this.state = {
            isLoading: false,
            isDrawing: false
        };

        this.refMap = React.createRef();
        this.refTrack = React.createRef();

        this.map = null;//bind canvas with the class WorldMap -> we can use canvas outside generateMap func
        this.color = d3Scale.scaleOrdinal(schemeCategory10);
    }
    componentDidMount() {
        axios.get(WORLD_MAP_URL)
            .then( res => {
                const {data} = res;
                const land = feature(data, data.objects.countries).features;
                this.generateMap(land);
            })
            .catch( err => {
                console.log(`err in fetching map data ${err}`)
            })
    }

    generateMap = land => {
        const projection = geoKavrayskiy7()
            .scale(170)
            .translate([width / 2, height / 2])
            .precision(.1);
        const graticule = geoGraticule();
        const canvas = d3Select(this.refMap.current)
            .attr("width", width)
            .attr("height", height);
        //canvas2 for sat tracking
        const canvas2 = d3Select(this.refTrack.current)
            .attr("width", width)
            .attr("height", height);

        const context = canvas.node().getContext("2d");
        const context2 = canvas2.node().getContext("2d");

        //drawing map
        let path = geoPath().projection(projection).context(context);

        land.forEach(ele => {
            context.fillStyle = '#B3DDEF';
            context.strokeStyle = '#000';
            context.globalAlpha = 0.7;
            context.beginPath();
            path(ele);
            context.fill();
            context.stroke();

            context.strokeStyle = 'rgba(220, 220, 220, 0.1)';
            context.beginPath();
            path(graticule());
            context.lineWidth = 0.1;
            context.stroke();

            context.beginPath();
            context.lineWidth = 0.5;
            path(graticule.outline());
            context.stroke();
        })

        //bind both canvas and canvas2 with class WorldMap
        this.map = {
            context: context,
            context2: context2,
            projection: projection
        }

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        //compare whether the prev satData(satList) has changed
        //if changed, we should call backend to get new pos data
        if (prevProps.satData !== this.props.satData) {
            const {latitude,
                longitude,
                elevation,
                altitude,
                duration
            } = this.props.observerData;
            // duration amplify 60x
            const endTime = duration * 60;
            //STEP 1: prepare for urls
            const urls = this.props.satData.map(sat=>{
                const {satid} = sat;
                const url = `/api/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${altitude}/${endTime}/&apiKey=${SAT_API_KEY}`;
                //send ajax call, will return a promise
                return axios.get(url);
            })
            console.log("urls in map -> ", urls);
            //STEP 2: Parse sats positions, this can be applied with axios and promise
            // axios.all(urls)
            //     .then(
            //         axios.spread((...args)=>{
            //             return args.map(item => item.data)
            //         })
            //     )
            //     .then(response=>{
            //         console.log('response ->', response);
            //     })
            //     .catch(err=>{
            //         console.log("err in fetch satellite position: ", err.message);
            //     })

            //Promise.all will execute all the promises
            // Promise.all([axios.get(..),axios.get(..)...]).then(...)
            //the Promise.all execute results will be in order as the order in the [axios.get] input array
            Promise.all(urls)
                .then(results => {
                    console.log('->', results);
                    const arr = results.map(sat=> sat.data);
                    console.log('arr -> ', arr);
                    //drawing position
                    this.setState({
                        isLoading: false,
                        isDrawing: true
                    })
                    //case 1: isDrawing false -> track
                    //case 2: isDrawing true -> cannot track, give hint
                    if (!prevState.isDrawing) {
                        this.track(arr);
                    } else {
                        const oHint = document.getElementsByClassName("hint")[0];
                        oHint.innerHTML =
                            "Please wait for these satellite animation to finish before selection new ones!";
                    }
                    }).catch(e=>{
                    console.log('failed ->', e);
                })
        }
    }

    track = data => {
        //We draw the sat pos just as we draw the world map
        //Create a new canvas
        //canvas2
        if (!data || !data[0].hasOwnProperty("positions")) {
            throw new Error("no position data");
            return;
        }

        const len = data[0].positions.length;//the total number of positions we got
        const { duration } = this.props.observerData;
        const { context2 } = this.map;

        let now = new Date(); //start time
        let i = 0; // start sat positions
        //timer: for each second what we will do
        let timer = setInterval(()=>{
            let ct = new Date();//current time, will change as interval is 1 second
            //count the interval time
            let timePassed = i === 0 ? 0 : ct - now;
            let time = new Date(now.getTime() + 60 * timePassed); //amplify 60X

            context2.clearRect(0, 0, width, height);
            //show time
            context2.font = "bold 14px sans-serif";
            context2.fillStyle = "#333";
            context2.textAlign = "center";
            context2.fillText(d3TimeFormat(time), width / 2, 10);

            if (i >= len) {
                clearInterval(timer);
                //when ending drawing, set isDrawing false
                //and clear Hint
                this.setState({ isDrawing: false });
                const oHint = document.getElementsByClassName("hint")[0];
                oHint.innerHTML = "";
                return;
            }

            data.forEach( sat=> {
                const {positions, info} = sat;
                this.drawSat(info, positions[i]);
            })

            i += 60;

        },1000)

    }

    drawSat= (sat, pos) => {
        const { satlongitude, satlatitude } = pos;

        if (!satlongitude || !satlatitude) return;
        const { satname } = sat;
        const nameWithNumber = satname.match(/\d+/g).join("");//regular expression: only use number
        const { projection, context2 } = this.map;
        //projection in map
        const xy = projection([satlongitude, satlatitude]);//generate x y axis
        //generate different color for each sats dynamically via d3 library
        context2.fillStyle = this.color(nameWithNumber);
        context2.beginPath();
        context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
        context2.fill();

        context2.font = "bold 11px sans-serif";
        context2.textAlign = "center";
        context2.fillText(nameWithNumber, xy[0], xy[1] + 14);

    }

    render() {
        return (
            <div className="map-box">
                <canvas className="map" ref={this.refMap}></canvas>
                <canvas className="track" ref={this.refTrack}></canvas>
                <div className="hint"></div>
            </div>
        );
    }
}

export default WorldMap;