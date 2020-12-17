import React, {Component} from 'react';
import axios from 'axios';
import SatSetting from './SatSetting';
import SatelliteList from './SatelliteList';
import WorldMap from './WorldMap'
import {NEARBY_SATELLITE, SAT_API_KEY, STARLINK_CATEGORY} from '../constants';

class Main extends Component {
    state = {
        satInfo: null,
        settings: null,
        satList: null,
        isLoadingList: false
    }

    render() {
        const {satInfo, isLoadingList, settings, satList} = this.state;
        return (
            <div className="main">
                <div className="left-side">
                    <SatSetting onShow={this.showSatellite}/>
                    <SatelliteList satInfo={satInfo}
                        isLoadingList={isLoadingList}
                                   onShowMap={this.showMap}
                    />
                </div>
                <div className="right-side">
                    <WorldMap satData={satList} observerData={settings}
                    />
                </div>
            </div>
        );
    }

    showMap = (satList) => {
        console.log("show on the map", satList);
        //setState
        this.setState({
                satList: [...satList]
            })
    }
    showSatellite = setting => {
        console.log('setting -> ', setting);
        this.setState({settings: setting});
        //fetch
        this.fetchSatellite(setting)
    }
    fetchSatellite = setting => {
        //fetch data from N2YO
        //step1 get setting values
        const{latitude, longitude, elevation, altitude} = setting;
        //step2 prepare the url
        const url = `/api/${NEARBY_SATELLITE}/${latitude}/${longitude}/${elevation}/${altitude}/${STARLINK_CATEGORY}/&apiKey=${SAT_API_KEY}`;
        this.setState({isLoadingList: true});
        //step3 make ajax call
        axios.get(url).then(response =>{
            console.log(response.data)
            this.setState({
                satInfo: response.data,
                isLoadingList: false
            })
        }).catch(
            err => {
                console.log('err in fetch satellite list ->', err);
                this.setState({isLoadingList: false});
            }
        )
        //step4
    }
}

export default Main;