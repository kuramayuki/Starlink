import React, {Component} from 'react';
import {Button, List, Avatar, Checkbox, Spin} from 'antd';
import satLogo from '../assets/images/satellite.svg';

class SatelliteList extends Component {
    state = {
        selected: []
    }
    render() {
        const satList = this.props.satInfo ? this.props.satInfo.above : [];
        console.log(satList);
        const{ isLoadingList} = this.props;
        return (
            <div className="sat-list-box">
                <div className="btn-container">
                    <Button  className="sat-list-btn"
                             type="primary"
                             size="large"
                             onClick={this.onShowSatPosOnMap}
                    >
                        Track on the map
                    </Button>
                </div>
                <hr/>
                {
                    isLoadingList ? <div>
                        <Spin className="spin-box" tip="loading..." size="large"></Spin>
                    </div>
                        :
                        <List className="sat-list"
                              itemLayout="horizontal"
                              dataSource={satList}
                              renderItem={
                                  item =>
                                      <List.Item
                                          actions = {[
                                              <Checkbox dataInfo={item} onChange={this.onChange}/>
                                          ]}>
                                          <List.Item.Meta
                                              avatar={<Avatar
                                                  size={50}
                                                  src={satLogo}/>}
                                              title={<p>{item.satname}</p>}
                                              description={`Launch Date: ${item.launchDate}`}
                                          />
                                      </List.Item>
                              }
                        />

                }

            </div>
        );
    }
    onShowSatPosOnMap = () => {
        this.props.onShowMap(this.state.selected);
    }
    onChange = e => {
        console.log('selected checkbox', e.target);
        console.log("data ->", e.target.dataInfo);
        //step 1: get current selected sat info
        const { dataInfo, checked } = e.target;
        const { selected } = this.state;
        //step 2: add or remove current selected sat to / from selected array
        const list = this.addOrRemove(dataInfo, checked, selected);
        //step 3: set state/update selected state
        console.log('list ->', list);
        this.setState({selected: list})
    }
    addOrRemove = (item, status, list) => {
        //case 1: check is true
        //      -> item not in the list => add item
        //      -> item is in the list => do nothing
        //case 2: check is false
        //      -> item not in the list => do nothing
        //      -> item is in the list => remove item
        const found = list.some( entry => entry.satid === item.satid );
        //here we use .some not .includes, because includes can not compare object type
        //but .some will iterate the whole array, and apply comparison logic to each element
        console.log('found ->', found);
        if (status && !found) {
            list = [...list, item];
        }
        if (!status && found) {
            list = list.filter( entry => entry.satid !== item.satid)
        }
        return list;
    }
}

export default SatelliteList;