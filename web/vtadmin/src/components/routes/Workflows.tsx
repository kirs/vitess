/**
 * Copyright 2021 The Vitess Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { groupBy, orderBy } from 'lodash-es';
import * as React from 'react';
import { Link } from 'react-router-dom';

import style from './Workflows.module.scss';
import { useWorkflows } from '../../hooks/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../Button';
import { DataCell } from '../dataTable/DataCell';
import { DataTable } from '../dataTable/DataTable';
import { Icons } from '../Icon';
import { TextInput } from '../TextInput';
import { useSyncedURLParam } from '../../hooks/useSyncedURLParam';
import { filterNouns } from '../../util/filterNouns';
import { getStreams, getTimeUpdated } from '../../util/workflows';
import { formatDateTime, formatRelativeTime } from '../../util/time';
import { StreamStatePip } from '../pips/StreamStatePip';

export const Workflows = () => {
    useDocumentTitle('Workflows');
    const { data } = useWorkflows({ refetchInterval: 1000 });
    const { value: filter, updateValue: updateFilter } = useSyncedURLParam('filter');

    const sortedData = React.useMemo(() => {
        const mapped = (data || []).map((workflow) => ({
            clusterID: workflow.cluster?.id,
            clusterName: workflow.cluster?.name,
            keyspace: workflow.keyspace,
            name: workflow.workflow?.name,
            source: workflow.workflow?.source?.keyspace,
            sourceShards: workflow.workflow?.source?.shards,
            streams: groupBy(getStreams(workflow), 'state'),
            target: workflow.workflow?.target?.keyspace,
            targetShards: workflow.workflow?.target?.shards,
            timeUpdated: getTimeUpdated(workflow),
        }));
        const filtered = filterNouns(filter, mapped);
        return orderBy(filtered, ['name', 'clusterName', 'source', 'target']);
    }, [data, filter]);

    const renderRows = (rows: typeof sortedData) =>
        rows.map((row, idx) => {
            const href =
                row.clusterID && row.keyspace && row.name
                    ? `/workflow/${row.clusterID}/${row.keyspace}/${row.name}`
                    : null;

            return (
                <tr key={idx}>
                    <DataCell>
                        <div className="font-weight-bold">{href ? <Link to={href}>{row.name}</Link> : row.name}</div>
                        <div className="font-size-small text-color-secondary">{row.clusterName}</div>
                    </DataCell>
                    <DataCell>
                        {row.source ? (
                            <>
                                <div>{row.source}</div>
                                <div className={style.shardList}>{(row.sourceShards || []).join(', ')}</div>
                            </>
                        ) : (
                            <span className="text-color-secondary">N/A</span>
                        )}
                    </DataCell>
                    <DataCell>
                        {row.target ? (
                            <>
                                <div>{row.target}</div>
                                <div className={style.shardList}>{(row.targetShards || []).join(', ')}</div>
                            </>
                        ) : (
                            <span className="text-color-secondary">N/A</span>
                        )}
                    </DataCell>

                    {/* TODO(doeg): add a protobuf enum for this (https://github.com/vitessio/vitess/projects/12#card-60190340) */}
                    {['Error', 'Copying', 'Running', 'Stopped'].map((streamState) => (
                        <DataCell key={streamState}>
                            {streamState in row.streams ? (
                                <>
                                    <StreamStatePip state={streamState} /> {row.streams[streamState].length}
                                </>
                            ) : (
                                <span className="text-color-secondary">-</span>
                            )}
                        </DataCell>
                    ))}

                    <DataCell>
                        <div className="font-family-primary white-space-nowrap">{formatDateTime(row.timeUpdated)}</div>
                        <div className="font-family-primary font-size-small text-color-secondary">
                            {formatRelativeTime(row.timeUpdated)}
                        </div>
                    </DataCell>
                </tr>
            );
        });

    return (
        <div className="max-width-content">
            <h1>Workflows</h1>

            <div className={style.controls}>
                <TextInput
                    autoFocus
                    iconLeft={Icons.search}
                    onChange={(e) => updateFilter(e.target.value)}
                    placeholder="Filter workflows"
                    value={filter || ''}
                />
                <Button disabled={!filter} onClick={() => updateFilter('')} secondary>
                    Clear filters
                </Button>
            </div>

            <DataTable
                columns={['Workflow', 'Source', 'Target', 'Error', 'Copying', 'Running', 'Stopped', 'Last Updated']}
                data={sortedData}
                renderRows={renderRows}
            />
        </div>
    );
};
