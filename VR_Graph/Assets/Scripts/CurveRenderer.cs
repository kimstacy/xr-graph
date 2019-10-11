using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CurveRenderer : MonoBehaviour
{

    LineRenderer linerenderer;

    // Start is called before the first frame update
    void Start()
    {
        linerenderer = GetComponent<LineRenderer>();

        Vector3[] positions = new Vector3[] {
            new Vector3(0,0,0),
            new Vector3(2,0,0),
            new Vector3(2,0,2),
            new Vector3(2,2,2),
            new Vector3(4,2,2),
            new Vector3(4,2,4),
            new Vector3(4,4,4),
            new Vector3(6,4,4),
            new Vector3(6,4,6),
            new Vector3(6,6,6),
        };
        linerenderer.positionCount = positions.Length;
        linerenderer.SetPositions(positions);
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
